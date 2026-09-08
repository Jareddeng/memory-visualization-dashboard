import fs from 'node:fs';
import { saveCleanLibrary } from './clean-intel-library.mjs';
saveCleanLibrary(JSON.parse(fs.readFileSync('content/intel/clawbot_intel.json', 'utf8')));
