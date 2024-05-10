package prv.liuyao.bsutils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import prv.liuyao.bsutils.utils.HttpUtils;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.io.UnsupportedEncodingException;
import java.util.*;
import java.util.concurrent.*;

@Controller
public class TestController {

    private final Map<HttpSession, Long> loginMap = new ConcurrentHashMap<>();
    private Thread t;

    @GetMapping("/test/{corpCode}")
    @ResponseBody
    public String page(@PathVariable String corpCode) {
        return corpCode;
    }

    @GetMapping("/login")
    public String login(){
        return "login";
    }

    @GetMapping("/doBrowser")
    @ResponseBody
    public String doBrowser(HttpServletRequest request, String url){
        if (!checkLogin(request.getSession())) {
            return "<h1>Error</h1>";
        }
        byte[] html = HttpUtils.ajax(url, HttpUtils.Method.GET, 500, null, null);
        try {
            return new String(html, "utf-8");
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        return "";
    }

    private synchronized void addLogin(HttpSession session){
        loginMap.put(session, System.currentTimeMillis());
        checkTimeout();
    }
    private synchronized boolean checkLogin(HttpSession session){
        if (loginMap.containsKey(session)) {
            loginMap.put(session, System.currentTimeMillis());
            return true;
        }
        return false;
    }
    public void checkTimeout(){
        if (null == t){
            t = new Thread(()->{
                long min5 = 300_000;
                while (true) {
                    synchronized (this){
                        if (!loginMap.isEmpty()){
                            long t = System.currentTimeMillis();
                            for (HttpSession s: loginMap.keySet()){
                                if (loginMap.get(s) - t > min5) {
                                    loginMap.remove(s);
                                }
                            }
                        }
                        if (loginMap.isEmpty()) {
                            break;
                        }
                    }
                    try {
                        Thread.sleep(min5);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            });
        }
        if (!t.isAlive()) {
            t.start();
        }
    }
}
