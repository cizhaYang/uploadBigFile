// 注意：hash.js文件要放在最外层的public文件夹下

importScripts("spark-md5.min.js"); // 导入脚本

onmessage = event => {
  const file = event.data;

  const fileReader = new FileReader();
  fileReader.readAsArrayBuffer(file);
  fileReader.onload = e => {
    try {
      const buffer = e.target.result;
      const spark = new SparkMD5.ArrayBuffer();
      spark.append(buffer);
      const hash = spark.end();
      const suffix = file.name.split(".")[1];
      postMessage({ buffer, hash, suffix });
    } catch (e) {
      console.log("err:", e);
    }
  };
};
