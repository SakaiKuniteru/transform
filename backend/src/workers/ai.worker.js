'use strict';

const { TEN_QUEUE } = require('../config/queue');
const { chayWorkerQueue } = require('./worker-entry');

void chayWorkerQueue(TEN_QUEUE.AI);