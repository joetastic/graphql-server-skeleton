import { Firestore, FirestoreDataConverter } from '@google-cloud/firestore';
import { playersForEvent, profileCollection } from './collections';
import { IResolvers, Profile, TournamentPlayer } from './generated/graphql';
import { Mutation } from './mutations';
import { Query } from './queries';

const resolvers: IResolvers<{ userId: Promise<string> }> = {
  Query,
  Mutation
};

export default resolvers;
