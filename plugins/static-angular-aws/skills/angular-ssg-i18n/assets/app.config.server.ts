import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DATA_FILE_READER } from './core/data/data-reader';
import { readDataFile } from './core/data/read-data-file.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: DATA_FILE_READER, useValue: readDataFile },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
