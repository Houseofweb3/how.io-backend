#### Removes the dist directory.

- `npm run clean`

#### Cleans the dist directory and compiles TypeScript files.

- `npm run build`

#### Runs the application using Node.js.

- `npm run start`

#### Runs the application using ts-node on local.

- `npm run local`

#### Runs the application on local(**recommended*).

- `npm run local:watch`

#### Placeholder for test scripts. Currently, it outputs an error message.

- `npm test`

#### Command to run eslint on specific file

- `npx eslint <path-to-your-file>.<js/ts>`

#### Command to run eslint on project(src/*).

- `npm run lint`

#### Command to run prettier on specific file.

- `npx prettier package.json --write`

#### Command to prettier on the entire project with prettier(src/*).

- `npm run pretty`

#### Command to run eslint and prettier on the entire project(src/*).

- `npm run format-and-lint`

#### Branching strategy
- `main` 
1. This is production branch. Never touch it or there will be terrible consequences.:)
2. We will only merge dev rom into main branch
- `dev`
1. Always take feature branch from dev branch and merge it in this branch.
2. This branch will also be deployed for testing purposes.
- `####-<feature-info>`
1. '####' = Ticket/Card number. Properly describe the feature that you are working on.
2. Once approved. This branch will be merged into dev branch.

#### Commit strategy
- `git commit -m '####-<meaningful-commit>`
1. '####' = Ticket/Card number. Properly describe the feature on which you worked through meaningful commit message.
2. Writing bad commit comments will have dangerous consequences. 😈

#### Commands to build and run the docker container(detached mode)

- `docker build -t <your-image-name> .` e.x. `docker build -t kol-tool .`

- `docker run -d -p 3000:3000 your-image-name` e.x. `docker run -d -p 3000:3000 kol-tool`

#### Swagger
- Swagger documentation can be viewed at <base-url>/docs. e.x. http://localhost:3000/docs

#### API Collection
- We use postman for documenting and testing our APIs.

#### Different logging levels in winston

```
logger.error('This is an error message');
logger.warn('This is a warning message');
logger.info('This is an informational message');
logger.http('This is an HTTP log message');
logger.verbose('This is a verbose log message');
logger.debug('This is a debug log message');
logger.silly('This is a silly log message');
```
