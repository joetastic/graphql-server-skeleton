import { ApolloServer, AuthenticationError } from 'apollo-server';
import jwt, { GetPublicKeyOrSecret, VerifyOptions } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { environment } from './environment';
import resolvers from './resolvers';
import typeDefs from './schemas';

export interface Auth0AccessToken {
  iss: string;
  sub: string;
  aud: string[];
  iat: number;
  exp: number;
  azp: string;
  scope: string;
  permissions?: string[];
}

const client = jwksClient({
  jwksUri: `https://mylimelight.auth0.com/.well-known/jwks.json`
});

const getKey: GetPublicKeyOrSecret = (header, cb) => {
  if (header.kid === undefined) {
    return cb(new AuthenticationError("Couldn't get key, no kid in header"));
  }
  client.getSigningKey(header.kid, function(err, key) {
    if ('publicKey' in key) {
      cb(null, key.publicKey);
    } else if ('rsaPublicKey' in key) {
      cb(null, key.rsaPublicKey);
    } else {
      cb(new AuthenticationError("Couldnt' get public key"));
    }
  });
};

const options: VerifyOptions = {
  audience: 'https://api.mylimelight.com',
  issuer: 'https://mylimelight.auth0.com/',
  algorithms: ['RS256']
};

const {
  apollo: { introspection, playground }
} = environment;

const server = new ApolloServer({
  resolvers,
  typeDefs,
  introspection,
  playground,
  context: ({ req }) => {
    // simple auth check on every request
    const userId = new Promise<string>((resolve, reject) => {
      const tokenMatch =
        req.headers.authorization &&
        /^Bearer (.*)$/.exec(req.headers.authorization);
      if (!tokenMatch)
        return reject(
          new AuthenticationError('No Authorization header passed')
        );
      const token = tokenMatch[1];
      jwt.verify(token, getKey, options, (err, decoded) => {
        if (err) {
          return reject(err);
        }

        const accessToken = decoded as Auth0AccessToken;

        resolve(accessToken.sub); // FIXME: not very good jwt.verify typing
      });
    });

    return {
      userId
    };
  }
});

server
  .listen({ port: environment.port, host: '0.0.0.0' })
  .then(({ url }) => console.log(`Server ready at ${url}. `));

declare const module: {
  hot: __WebpackModuleApi.Hot;
};

if (module.hot) {
  console.log('Watching for HMR');
  module.hot.accept();
  module.hot.dispose(() => server.stop());
}
