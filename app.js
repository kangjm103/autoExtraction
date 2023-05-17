const fs = require('fs');
const path = require('path');
const projectPath = '../../MFO/web/MAXGAUGE_MYUNG';

const getLanguageFileObj = async () => {
  const languageFilePath = '/common/locale';
  const languageFileName = 'exem-lang-ja.js';
  const filePath = path.join(`${projectPath}${languageFilePath}`, languageFileName);
  const stats = await fs.promises.stat(filePath);
  let languageFileObj;

  if (stats.isFile()) {
    const data = await fs.promises.readFile(filePath, 'utf8');
    languageFileObj = JSON.parse(
      data
        .replace('window.msgMap = ', '')
        .replace(';', '')
        .replace(/.*\\'.*/g, '') // "\'" 가 포함된 문자열은 Key 로 사용할 수 없기 때문에 Pass.(수동 확인 필요)
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '') // 주석 제거
    );
  }

  // 중복 Key 제거해줌 (upper case 기준)
  return Object.keys(languageFileObj).reduce((acc, key) => {
    if (!acc[key.toUpperCase()]) {
      acc[key.toUpperCase()] = languageFileObj[key];
    }

    return acc;
  }, {});
};

const main = async () => {
  const languageFileObj = await getLanguageFileObj();
  const prefix = 'common\\.Util\\.TR\\(\'';
  const suffix1 = '\'\\)';
  const suffix2 = '\'\\,';
  const outputPath = './output.txt';
  const outputMap = {};
  const stream = await fs.createWriteStream(outputPath, { flags: 'a' });
  const traverseDir = async (directory) => {
    const files = await fs.promises.readdir(directory);
    const promises = files.map(async file => await asyncOperation({ directory, file }));
    await Promise.all(promises);
  };
  const asyncOperation = async ({ directory, file }) => {
    return new Promise(async (resolve) => {
      const filePath = path.join(directory, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()
        && path.extname(filePath) === '.js') {
        const data = await fs.promises.readFile(filePath, 'utf8');
        const regex = new RegExp(`${prefix}(.*?)(${suffix1}|${suffix2})`,'g'); // "common.Util.TR('" 로 시작해서 "')" 혹은 "'," 로 끝나는 내용
        // const regex = new RegExp('common\\.Util\\.TR\\(([^\'].+?)\\)', 'g'); // "common.Util.TR(" 로 시작하면서 바로 뒤에 "'" 가 오지 않고 ")" 로 끝나는 내용
        let match;

        while ((match = regex.exec(data)) !== null) {
          const value = match[1];
          const capitalValue = value.toUpperCase();

          // // value 값만 뽑기
          // if (!outputMap[value]) {
          //   stream.write(`${value}\n`);
          //   outputMap[value] = true;
          // }

          if (value.indexOf('\'') > -1) {
            // 위에서 "\'" 가 들어간 문자열은 번역 리스트 객체에 포함되지 못했기때문에 Pass.
            // 수동으로 "\'" 를 검색하여 포함된 문자열들은 별도 확인 필요.
            continue;
          }

          if (!languageFileObj[capitalValue]
            && !outputMap[capitalValue]) {
            stream.write(`${value}\n`);
            outputMap[capitalValue] = true;
          }

          // // 전체 번역 리스트 (중복 제거된)
          // if (!outputMap[capitalValue]) {
          //   stream.write(`${value}\n`);
          //   outputMap[capitalValue] = true;
          // }
        }
      } else if (stats.isDirectory()) {
        await traverseDir(filePath);
      }

      resolve();
    });
  }

  fs.truncateSync(outputPath);
  await traverseDir(projectPath);
  stream.end();
};

main();
