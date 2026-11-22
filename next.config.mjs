import {createMDX} from 'fumadocs-mdx/next';

const withMDX = createMDX();

const organizationName = process.env.GITHUB_REPOSITORY_OWNER || 'tuantran0910';
const projectName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'tuantran0910.github.io';
const basePath =
  projectName.toLowerCase() === `${organizationName.toLowerCase()}.github.io`
    ? ''
    : `/${projectName}`;

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  ...(basePath ? {basePath} : {}),
  images: {
    unoptimized: true,
  },
};

export default withMDX(config);
