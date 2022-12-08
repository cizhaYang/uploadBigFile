const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const multiparty = require("multiparty"); // 用来解析form-data数据格式
const SparkMD5 = require("spark-md5");

const PORT = 3000;
const HOST = "http://127.0.0.1";
const HOSTNAME = `${HOST}:${PORT}`;
const SUCCESS = 0;
const ERROR = 1;
// 上传的文件保存文件的路径
const uploadDir = `${__dirname}/upload`;

const app = express();

/* 中间件 */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.use(express.json());

app.listen(PORT, () => {
  console.log("服务启动成功!!", HOSTNAME);
});

/**
 * 文件上传接口
 */
app.post("/upload_chunk", async (req, res) => {
  try {
    const { files, fields } = await multipartyLoad(req);
    const file = files.file[0];
    const filename = fields.filename[0];
    // 创建存放切片的临时目录
    const HASH = filename.split("_")[0];
    let path = `${uploadDir}/${HASH}`;
    // 判断路径是否存在，不存在创建
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    path = `${uploadDir}/${HASH}/${filename}`;
    // 判断文件是否已存在
    // const isExists = await existsFile(path);
    // if (isExists) {
    //   res.send({
    //     code: 0,
    //     codeText: "文件已存在",
    //     originalFilename: filename,
    //     url: path.replace(__dirname, HOSTNAME),
    //   });
    //   return;
    // }
    const data = await writeFile(path, file);
    if (data.code === SUCCESS) {
      res.send({
        code: SUCCESS,
        codeText: "上传成功!",
      });
      return;
    }
    res.send({
      code: ERROR,
      codeText: "上传失败!",
    });
  } catch (err) {
    res.send({
      code: ERROR,
      codeText: `上传失败: ${err}`,
    });
  }
});

/**
 * 合并切片接口
 */
app.post("/upload_merge", async (req, res) => {
  try {
    const { hash, count } = req.body;

    const { path, filename } = await merge(hash, count);
    res.send({
      code: 0,
      codeText: "合并成功",
      originalFilename: filename,
      url: path.replace(__dirname, HOSTNAME),
    });
  } catch (err) {
    console.log("报错了----", err);
    res.send({
      code: 1,
      codeText: "合并失败",
    });
  }
});

const merge = (hash, count) => {
  return new Promise(async (resolve, reject) => {
    const path = `${uploadDir}/${hash}`;
    // 获取所有的切片文件
    const fileList = fs.readdirSync(path);
    if (fileList.length !== +count) {
      reject("文件上传有缺失");
      return;
    }
    // 合并切片
    let suffix;
    fileList
      .sort((a, b) => {
        let reg = /_(\d+)/;
        return reg.exec(a)[1] - reg.exec(b)[1];
      })
      .forEach(item => {
        !suffix ? (suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1]) : null; // 处理文件后缀
        fs.appendFileSync(
          `${uploadDir}/${hash}.${suffix}`,
          fs.readFileSync(`${path}/${item}`)
        );
        fs.unlinkSync(`${path}/${item}`); // 删除文件
      });
    // 删除文件夹
    fs.rmdirSync(path);
    resolve({
      path: `${uploadDir}/${hash}.${suffix}`,
      filename: `${hash}.${suffix}`,
    });
  });
};

const multipartyLoad = req => {
  const config = {
    maxFieldsSize: 200 * 1024 * 1024,
  };
  return new Promise(async (resolve, reject) => {
    await delay();
    new multiparty.Form(config).parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        files,
        fields,
      });
    });
  });
};

// 延迟函数
const delay = interval => {
  typeof interval !== "number" ? (interval = 1000) : null;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, interval);
  });
};

/**
 * 写入文件
 * @param {*} path 保存的路径
 * @param {*} file 要写入的文件
 * @returns
 */
const writeFile = (path, file) => {
  return new Promise(async (resolve, reject) => {
    const byfferFile = fs.readFileSync(file.path);
    fs.writeFile(path, byfferFile, err => {
      if (err) {
        reject({
          code: 1,
          codeText: err,
        });
        return;
      }
      resolve({
        code: 0,
      });
    });
  });
};

// 判断文件是否存在
const existsFile = path => {
  return new Promise((resolve, reject) => {
    fs.access(path, fs.constants.F_OK, err => {
      resolve(err ? false : true);
    });
  });
};
