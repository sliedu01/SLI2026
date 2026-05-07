const os = require('os');

const originalUserInfo = os.userInfo;
os.userInfo = (options) => {
  try {
    const info = originalUserInfo(options);
    info.username = 'user';
    return info;
  } catch (e) {
    return { username: 'user', uid: -1, gid: -1, shell: '', homedir: '' };
  }
};

os.hostname = () => 'user-pc';

// just in case they use this
process.env.USER = 'user';
process.env.USERNAME = 'user';
process.env.COMPUTERNAME = 'user';
process.env.USERDOMAIN = 'user';
