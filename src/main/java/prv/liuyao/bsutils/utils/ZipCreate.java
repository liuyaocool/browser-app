package prv.liuyao.bsutils.utils;

import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.URLEncoder;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class ZipCreate {

    private OutputStream os;
    private ZipOutputStream out;
    private String charset;
    private HttpServletResponse response;

    public ZipCreate(HttpServletResponse response, String charset) throws IOException {
        this.charset = charset;
        this.response = response;
        this.os = response.getOutputStream();
        this.out = new ZipOutputStream(this.os);
    }

    // zip 文件中的路径
    public synchronized void addFile(String path, byte[] content) {
        try {
            this.out.putNextEntry(new ZipEntry(path));
            for (byte b: content) {
                this.out.write(b);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void response(String fileName)  {
        this.response.setContentType("application/octet-stream;charset=" + this.charset);
        try {
            fileName = URLEncoder.encode(fileName, "utf-8").replace("+", " ");
//            fileName = this.response.encodeURL(new String(fileName.getBytes(), this.charset));
            this.response.setHeader("Content-Disposition", "attachment;filename=" + fileName);
            this.out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
        close(this.out, this.os);
    }

    public static void close(AutoCloseable... closes){
        for (AutoCloseable c: closes){
            try {
                if (null != c) c.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

}
