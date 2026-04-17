# File Explorer

![Preview](preview.png)

File storage management tool for [The Odin Project](https://www.theodinproject.com/).

[Source Repository](https://github.com/ChiefWoods/file-explorer)

## Features

- Create folders with different depths
- Upload and store retrievable files
- Share folder access with customizable expiration times 

## Built With

### Tech Stack

- [![TanStack Start](https://img.shields.io/badge/TanStack-Start-383936?style=for-the-badge&logo=reactrouter)](https://tanstack.com/start/)
- [![Prisma](https://img.shields.io/badge/Prisma-383936?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
- [![Shadcn](https://img.shields.io/badge/Shadcn-383936?style=for-the-badge&logo=shadcnui)](https://ui.shadcn.com/)
- [![Vitest](https://img.shields.io/badge/Vitest-383936?style=for-the-badge&logo=vitest)](https://vitest.dev)
- [![Docker](https://img.shields.io/badge/Docker-383936?style=for-the-badge&logo=docker)](https://www.docker.com/)

## Getting Started

### Prerequisites

Update your Bun toolkit to the latest version.

```bash
bun upgrade
```

### Setup

1. Clone the repository

```bash
git clone https://github.com/ChiefWoods/file-explorer.git
```

2. Install all dependencies

```bash
bun install
```

3. Create env file

```bash
cp .env.example .env.development
```

4. Start local Postgres (dev)

```bash
bun run docker:db:up
```

5. Apply migrations

```bash
bun run db:migrate
```

6. Start development server

```bash
bun run dev
```

7. Build project

```bash
bun run build
```

8. Preview build

```bash
bun run start
```

### Testing

1. Create env file

```bash
cp .env.example .env.test
```

2. Start local Postgres (test)

```bash
bun run docker:test-db:up
```

3. Test project

```bash
bun run test
```

## Issues

View the [open issues](https://github.com/ChiefWoods/file-explorer/issues) for a full list of proposed features and known bugs.

## Acknowledgements

### Resources

- [Shields.io](https://shields.io/)
- [Lucide](https://lucide.dev/)

## Contact

[chii.yuen@hotmail.com](mailto:chii.yuen@hotmail.com)
