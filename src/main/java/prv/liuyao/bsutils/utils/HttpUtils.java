package prv.liuyao.bsutils.utils;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import liuyao.utils.ObjectUtils;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;

public class HttpUtils {

    public enum Method{

        OPTIONS("OPTIONS"), POST("POST"), GET("GET"), HEAD("HEAD"),
        PUT("PUT"), DELETE("DELETE"), CONNECT("CONNECT"), TRACE("TRACE");
        private String method;
        Method(String method) { this.method = method; }
        public String getMethod() { return method; }
    }

    public enum Charset{
        UTF8("utf-8");
        private String code;
        Charset(String code) { this.code = code; }
        public String getCode() { return code; }
    }

    public static byte[] ajax(String url, Method method, Integer timeout,
                              Map<String, String> headers,
                              Map<String, String> data){
        Charset encoding = Charset.UTF8;
        OutputStreamWriter osw = null;
        try{
            HttpURLConnection conn = getConn(url, method, headers);
            conn.setDoOutput(true);
            switch (method){
                case POST:
                    osw = new OutputStreamWriter(conn.getOutputStream(), encoding.getCode());
                    if (null != data && data.size() > 0){
                        JSONObject json = new JSONObject();
                        for (String key : data.keySet()) {
                            json.put(key, data.get(key));
                        }
                        osw.write(json.toString());
                    }
                    osw.flush();
                    break;
                default: break;
            }
            conn.connect();
            byte[] result = null;
            if (conn.getResponseCode() == 200) {
                return byteResult(conn, timeout);
            } else {
                result = String.valueOf(conn.getResponseCode()).getBytes();
            }
            conn.disconnect();
            return result;
        }catch (Exception e){
            e.printStackTrace();
        }finally {
            close(osw);
        }
        return new byte[0];
    }

    private static byte[] byteResult(HttpURLConnection conn, Integer timeout) {
        List<byte[]> ret = new ArrayList<>();
        int len;
        int total = 0;
        byte[] result;
        try {
            InputStream is = conn.getInputStream();
            while ((len = is.available()) > 0) {
                is.read(result = new byte[len]);
                ret.add(result);
                total += len;
                Thread.sleep(timeout);
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
        result = new byte[total];
        len = 0;
        for (byte[] b: ret) {
            System.arraycopy(b, 0, result, len, b.length);
            len += b.length;
        }
        return result;
    }


    public static void fileRequest(String url, Method method, Map<String, File> files) {
        System.out.println("=========================请求=================================");
        System.out.println(url);
        String BOUNDARY = UUID.randomUUID().toString(),
                PREFIX = "--",
                LINEND = "\r\n",
                MULTIPART_FROM_DATA = "multipart/form-data";
        Charset encoding = Charset.UTF8;
        DataOutputStream dos = null;
        InputStream is = null;

        Map<String, String> headers = new HashMap<>();
        headers.put("connection", "keep-alive");
        headers.put("Charsert", "UTF-8");
        headers.put("Content-Type", MULTIPART_FROM_DATA + ";boundary=" + BOUNDARY);

        try {
            HttpURLConnection conn = getConn(url, method, headers);

//        conn.setReadTimeout(5 * 1000);
            conn.setDoInput(true);// 允许输入
            conn.setDoOutput(true);// 允许输出
            conn.setUseCaches(false);

            dos = new DataOutputStream(conn.getOutputStream());
            System.out.println("---------------------------------------------------");

            // 发送文件数据
            if (ObjectUtils.isEmpty(files)){
                return;
            }
            for (Map.Entry<String, File> file : files.entrySet()) {
                StringBuilder sb1 = new StringBuilder();
                sb1.append(PREFIX);
                sb1.append(BOUNDARY);
                sb1.append(LINEND);
                sb1.append("Content-Disposition: form-data; name=\"files\"; filename=\"" + file.getKey() + "\"" + LINEND);
                sb1.append("Content-Type: application/octet-stream; charset=" + encoding + LINEND);
                sb1.append(LINEND);
                System.out.println(sb1);

                dos.write(sb1.toString().getBytes());
                is = new FileInputStream(file.getValue());
                byte[] buffer = new byte[1024];
                int len;
                while ((len = is.read(buffer)) != -1) {
                    dos.write(buffer, 0, len);
                }
                close(is);
                dos.write(LINEND.getBytes());
            }
            System.out.println("-------------------------------");

            // 请求结束标志
            byte[] end_data = (PREFIX + BOUNDARY + PREFIX + LINEND).getBytes();
            dos.write(end_data);
            dos.flush();

            System.out.println("=========================响应=================================");
            // 得到响应码
            System.out.println("responseCode："+conn.getResponseCode());
            if (conn.getResponseCode() == 200) {
                String result = getResult(conn, encoding);

                com.alibaba.fastjson.JSONObject datas = com.alibaba.fastjson.JSONObject.parseObject(result);
                System.out.println(datas.getInteger("code"));
                System.out.println(datas.getString("message"));
                JSONArray res = datas.getJSONArray("data");
                for (int i = 0; i < res.size(); i++) {
                    System.out.println(res.get(i));
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            close(dos);
            close(is);
        }

    }

    private static HttpURLConnection getConn(String url, Method method,
                                             Map<String, String> headers) throws IOException {
        HttpURLConnection conn = (HttpURLConnection)new URL(url).openConnection();
        conn.setRequestMethod(method.getMethod());
        StringBuilder sb = new StringBuilder(conn.getRequestMethod()).append(" ").append(url).append(" ");
        //添加请求头
        if (!ObjectUtils.isEmpty(headers)){
            for(String key: headers.keySet()){
                conn.setRequestProperty(key, headers.get(key));
                sb.append(key).append("=").append(headers.get(key)).append("; ");
            }
        }
        System.out.println("getConn: " + sb.toString());
        return conn;
    }

    public static String getResult(HttpURLConnection conn, Charset encoding){
        InputStreamReader isr = null;
        BufferedReader br = null;
        String result = null;
        try {
            isr = new InputStreamReader(conn.getInputStream(), encoding.getCode());
            br = new BufferedReader(isr);
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null){
                sb.append(line);
            }
            result = sb.toString();
        } catch (Exception e) {
            e.printStackTrace();
        }finally {
            close(isr);
            close(br);
            conn.disconnect();
        }
        return result;
    }


    public static void close(AutoCloseable... clo){
        if (null == clo || clo.length == 0) return;
        for (AutoCloseable c : clo) {
            try {
                if (null != c){ c.close(); }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public static <T extends com.alibaba.fastjson.JSON> T toJson(String jsonStr) {
        return (T) com.alibaba.fastjson.JSON.parse(jsonStr);
    }

}
