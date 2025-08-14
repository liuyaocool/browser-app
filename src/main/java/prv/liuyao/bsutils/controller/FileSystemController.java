package prv.liuyao.bsutils.controller;

import com.alibaba.fastjson.JSONObject;
import liuyao.utils.IOUtils;
import liuyao.utils.Stringutils;
import liuyao.utils.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import prv.liuyao.bsutils.config.handler.NonStaticResourceHttpRequestHandler;
import prv.liuyao.bsutils.global.GlobalConstant;
import prv.liuyao.bsutils.utils.Cache;
import prv.liuyao.bsutils.utils.DateUtil;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel;
import java.nio.channels.WritableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/fs")
public class FileSystemController {

    @Value("${pro.max-range:1000}")
    int maxRange;

    @Autowired
    private NonStaticResourceHttpRequestHandler nonStaticResourceHttpRequestHandler;

    @PostMapping("/getFolderChilds")
    @ResponseBody
    public String[] getFolderChilds(@RequestBody(required = false) String folderPath) {
        File[] files = !StringUtils.hasText(folderPath)
                ? File.listRoots() : new File(folderPath).listFiles();
        if (null == files) return new String[0];
        String [] childs = new String[files.length * 4];
        int i = 0;
        for (File file : files) {
            childs[i++] = file.isDirectory() ? "d" : "-";
            childs[i++] = StringUtils.hasText(file.getName()) ? file.getName()
                    // 解决没有文件名的情况
                    : file.getPath().replace(File.separatorChar, '/');
            childs[i++] = calcFileLength(file);
            childs[i++] = DateUtil.formatDatetime(new Date(file.lastModified()));
        }
        return childs;
    }

    // return int can error
    @GetMapping("/res")
    public void a(
            boolean download, String path,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader,
            HttpServletRequest request, HttpServletResponse response
    ) throws UnsupportedEncodingException {
        path = URLDecoder.decode(path, StandardCharsets.UTF_8.name());
        Path resPath = Paths.get(path);
        if (!Files.exists(resPath)) {
            response.setCharacterEncoding(GlobalConstant.DEFAULT_CHARSET.toString());
            responseError(response, HttpServletResponse.SC_NOT_FOUND, null);
            return;
        }
        // 获取文件长度
        long fileLength = resPath.toFile().length(), contentLength = fileLength;
        // 处理Range请求
        long start = 0;
        if (null != rangeHeader && rangeHeader.startsWith("bytes=")) {
            long end;
            String[] ranges = rangeHeader.substring(6).split("-");
            if (!Stringutils.isNum(ranges[0])) {
                responseRangeError(response, fileLength);
                return;
            }
            start = Long.parseLong(ranges[0]);
            if (ranges.length > 1) {
                if (!Stringutils.isNum(ranges[1])) {
                    responseRangeError(response, fileLength);
                    return;
                }
                end = Math.min(Long.parseLong(ranges[1]), fileLength - 1);
            } else {
                end = Math.min(start + this.maxRange * 1000L, fileLength -1);
            }
            contentLength = end - start + 1;
            response.setStatus(HttpServletResponse.SC_PARTIAL_CONTENT);
            response.setHeader(HttpHeaders.CONTENT_RANGE, String.format("bytes %d-%d/%d", start, end, fileLength));
        }

        if (download) {
            String name = URLEncoder.encode(resPath.getFileName().toString(),
                    StandardCharsets.UTF_8.name()).replace("+", " ");
            response.addHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=" + name);
        }
        response.setHeader(HttpHeaders.ACCEPT_RANGES, "bytes");
        response.setHeader(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength));

        // Zero-copy 传输
        // try(AutoCloseable),
        try (FileChannel fileChannel = FileChannel.open(resPath, StandardOpenOption.READ);
             // response.getOutputStream() 会被tomcat/jetty自动释放
             WritableByteChannel outChannel = Channels.newChannel(response.getOutputStream())
        ) {
            String mimeType = Files.probeContentType(resPath);
            if (StringUtils.hasText(mimeType)) {
                response.setContentType(mimeType);
            }
            long transferred = fileChannel.transferTo(start, contentLength, outChannel);
            if (transferred < contentLength) {
                // System.out.format("----------- %s / %s %s -----------\n", transferred, contentLength, rangeHeader);
                // return responseError(response, HttpServletResponse.SC_NOT_IMPLEMENTED, "Incomplete transfer");
            }
        } catch (IOException e) {
            log.error("transfer error", e);
            responseError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Error transfer");
        }
    }

    private void responseRangeError(HttpServletResponse response, long fileLength) {
        response.setHeader(HttpHeaders.CONTENT_RANGE, "bytes */" + fileLength);
        responseError(response, HttpServletResponse.SC_REQUESTED_RANGE_NOT_SATISFIABLE,
                "Invalid parameter: Range");
    }

    private void responseError(HttpServletResponse response, int code, @Nullable String msg) {
        // response.setStatus(code);
        if (null != msg && !msg.isEmpty()) {
            try {
                response.sendError(code, msg);
                // response.getWriter().write(msg);
            } catch (IOException e) {
                log.error("response error {} {}", code, msg, e);
            }
        }
    }

    @GetMapping("/download")
    public void down(HttpServletResponse response, String path) {
        if (!StringUtils.hasText(path)) {
            return;
        }
        File file = new File(URLDecoder.decode(path));
        if (0 == file.length()) {
            return;
        }
        response.setContentType("application/octet-stream");

        ServletOutputStream sos = null;
        FileInputStream fis = null;
        FileChannel fc = null;
        try {
            sos = response.getOutputStream();
            fis = new FileInputStream(file);
            fc = fis.getChannel();

            String mp3Name = URLEncoder.encode(file.getName(), "utf-8").replace("+", " ");
            response.addHeader("Content-Disposition", "attachment;filename=" + mp3Name);
            response.addHeader("Content-Length", "" + fc.size());
            IOUtils.transferTo(fc, sos);
            sos.flush();
        } catch (IOException e) {
            log.error("fs download error", e);
        } finally {
            IOUtils.close(fc, fis, sos);
        }
    }

    @GetMapping("/mediaPlay")
    public void mediaPlay(String path, HttpServletRequest request, HttpServletResponse response) throws UnsupportedEncodingException {
        path = URLDecoder.decode(path, StandardCharsets.UTF_8.name());
        Path filePath = Paths.get(path);
        if (Files.exists(filePath)) {
            try {
                String mimeType = Files.probeContentType(filePath);
                if (StringUtils.hasText(mimeType)) {
                    response.setContentType(mimeType);
                }
                request.setAttribute(NonStaticResourceHttpRequestHandler.ATTR_FILE, filePath);
                nonStaticResourceHttpRequestHandler.handleRequest(request, response);
            } catch (IOException e) {
                log.error("fs mediaPlay error 1: {}", e.getMessage());
            } catch (ServletException e) {
                log.error("fs mediaPlay error 2", e);
            }
        } else {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setCharacterEncoding(GlobalConstant.DEFAULT_CHARSET.toString());
        }
    }

    @GetMapping("/textGet")
    public JSONObject textGet(String path, int position, int size) throws UnsupportedEncodingException {
        path = URLDecoder.decode(path, StandardCharsets.UTF_8.name());
        JSONObject json = new JSONObject().fluentPut("code", 200);
        Path filePath = Paths.get(path);
        if (!Files.exists(filePath)) {
            return json.fluentPut("code", 404).fluentPut("data", "文件不存在");
        }
        FileInputStream fis = null;
        try {
            fis = new FileInputStream(path);
            byte[] read = new byte[size = size / 4 * 4];
            if (position < fis.available()) {
                fis.skip(position);
                fis.read(read);
            }
            if (fis.available() <= position + size) {
                json.put("last", true);
            }
            return json.fluentPut("position", position + size)
                    .fluentPut("data", new String(read, StandardCharsets.UTF_8));
        } catch (IOException e) {
            e.printStackTrace();
            return json.fluentPut("code", 500).fluentPut("data", e.getMessage());
        } finally {
            IOUtils.close(fis);
        }
    }

    @PostMapping("/uploadFile")
    public String uploadFile(MultipartFile file, String dir){
        FileOutputStream fos = null;
        InputStream is = null;
        String filePath = createFilePath(dir, file.getOriginalFilename());
        try {
            fos = new FileOutputStream(filePath);
            is = file.getInputStream();
            long len = IOUtils.transferTo(is, fos);
            return "upload " + file.getOriginalFilename() + " success, length: " + len;
        } catch (IOException e) {
            e.printStackTrace();
            return "upload " + file.getOriginalFilename() + " fail: " + e.getMessage();
        } finally {
            IOUtils.close(fos, is);
        }
    }

    @PostMapping("/uploadBigFile")
    public String uploadBigFile(
            MultipartFile file, String filename, String dir, String id, boolean isLastPart){
        FileChannel ch = Cache.get(id);
        InputStream is = null;
        try {
            if (null == ch) {
                File file1 = new File(createFilePath(dir, filename));
                if (!file1.exists()) file1.createNewFile();
                Cache.set(id, ch = FileChannel.open(file1.toPath(), StandardOpenOption.WRITE));
            }
            is = file.getInputStream();
            long len = IOUtils.transferTo(is, ch);
            return "upload " + filename + " success";
        } catch (IOException e) {
            e.printStackTrace();
            return "upload " + filename + " fail: " + e.getMessage();
        } finally {
            IOUtils.close(is);
            if (isLastPart) {
                IOUtils.close(ch);
                Cache.invalidCache(id);
            }
        }
    }

    public String createFilePath(String dir, String fileName) {
        StringBuilder filePath = new StringBuilder(dir.length() + fileName.length() + 50)
                .append(dir).append((dir.endsWith("/") || dir.endsWith(File.separator)) ? "" : File.separator)
                .append(fileName);
        if (new File(filePath.toString()).exists()) {
            synchronized (this) {
                filePath.append(".").append(System.currentTimeMillis());
            }
        }
        return filePath.toString();
    }

    public String calcFileLength(File file) {
        if (file.isDirectory()) {
            return "-";
        }
        double len = file.length() * 1.0;
        char[] lenUnit = {' ', 'K', 'M', 'G', 'T'};
        int lenUnitIdx = 0;
        for (; len > 1024; lenUnitIdx++) len /= 1024;
        String lenStr = String.valueOf(len);
        int pointIdx = lenStr.indexOf(".") + 3; // . 不被截取
        return ((pointIdx > lenStr.length()) ? lenStr : lenStr.substring(0, pointIdx)) + lenUnit[lenUnitIdx];
    }
}
