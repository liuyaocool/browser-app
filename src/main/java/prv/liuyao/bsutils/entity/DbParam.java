package prv.liuyao.bsutils.entity;

import com.jcraft.jsch.JSch;
import com.jcraft.jsch.JSchException;
import com.jcraft.jsch.Session;
import liuyao.utils.Stringutils;
import lombok.Getter;
import lombok.Setter;
import prv.liuyao.bsutils.enums.JdbcType;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Getter
@Setter
public class DbParam {

    public static final Map<String, Session> sessionMap = new ConcurrentHashMap<>();

    public static synchronized Session initSessionAndGet(DbParam param) throws JSchException {
        String cacheKey = new StringBuilder(param.sshHost)
                .append(param.sshPort).append(param.sshUser)
                .append(Stringutils.isBlank(param.sshKey) ? "password" : "ssh")
                .toString();
        Session session = sessionMap.get(cacheKey);
        if (null != session && session.isConnected()) {
            return session;
        }
        JSch jsch = new JSch();
        if (Stringutils.isNotBlank(param.sshKey)) {
            jsch.addIdentity(String.valueOf(param.sshKey.hashCode()),
                    param.sshKey.getBytes(StandardCharsets.UTF_8), null,
                    param.sshKeyPwd.getBytes(StandardCharsets.UTF_8));
        }
        session = jsch.getSession(param.sshUser, param.sshHost, param.sshPort);
        if (null != param.sshUserPwd && !param.sshUserPwd.isEmpty()) {
            session.setPassword(param.sshUserPwd);
        }
        session.setConfig("StrictHostKeyChecking", "no");
        session.connect();
        sessionMap.put(cacheKey, session);
        System.out.println("new session");
        return session;
    }

    public JdbcType driver;
    public String host;
    public int port;
    public String db;
    public String dbuser;
    public String dbpwd;
    public String sql;
    public boolean ssh;

    public String sshKey;
    public String sshKeyPwd;
    public String sshHost;
    public int sshPort;
    public String sshUser;
    public String sshUserPwd;

    public Session getSession() throws JSchException {
        return initSessionAndGet(this);
    }
}
