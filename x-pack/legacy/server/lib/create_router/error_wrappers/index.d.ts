/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';

export declare function wrapCustomError(error: Error, statusCode: number): Boom.Boom<null>;

export declare function wrapEsError(error: Error, statusCodeToMessageMap?: object): Boom.Boom<null>;

export declare function wrapUnknownError(error: Error): Boom.Boom<null>;
