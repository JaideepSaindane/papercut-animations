import { Config } from '@remotion/cli/config';

// Repo-level assets/ (fonts, music, sfx) is the public dir, so staticFile('fonts/...') resolves there.
Config.setPublicDir('../../assets');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
