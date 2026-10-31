import application from './worker.mjs';
import {privateStagingFetch} from './private-staging.mjs';
const worker={fetch:privateStagingFetch(application)};
export default worker;
