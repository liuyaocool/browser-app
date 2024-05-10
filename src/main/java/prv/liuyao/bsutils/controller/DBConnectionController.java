package prv.liuyao.bsutils.controller;

import com.jcraft.jsch.*;
import org.springframework.web.bind.annotation.*;
import prv.liuyao.bsutils.entity.DbParam;
import prv.liuyao.bsutils.entity.ResultBean;
import prv.liuyao.bsutils.utils.HttpUtils;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/database")
public class DBConnectionController {

    public final String EDIT_SQL_START[] = {"insert", "update", "delete", "alter", "comment", "create", "drop"};

    @PostMapping("/execute")
    @ResponseBody
    public ResultBean<String[]> doexecute(@RequestBody DbParam dbExecuteParam) {
        return execute(dbExecuteParam);
    }

    @PostMapping("/stop")
    @ResponseBody
    public ResultBean<String[]> stop() {
        close();
        ResultBean<String[]> result = new ResultBean<>();
        result.setCode(200);
        result.setRow(new String[]{"停止成功"});
        return result;
    }

    private Connection pgConn = null;
    private Session session = null;
    private int bindPort = 0;
    private void close() {
        HttpUtils.close(pgConn);
        if (null != session) {
            try {
                session.delPortForwardingL(bindPort);
            } catch (JSchException e) {
                e.printStackTrace();
            }
        }
        pgConn = null;
        session = null;
        bindPort = -1;
    }

    public synchronized ResultBean<String[]> execute(DbParam dbParam) {
        bindPort = 7777;
        try {
            if (dbParam.ssh) {
                (session = dbParam.getSession()).setPortForwardingL(bindPort, dbParam.host, dbParam.port);
                dbParam.host = "127.0.0.1"; dbParam.port = bindPort;
            }
            String pgUrl = dbParam.driver.getJdbcUrl(dbParam.host, dbParam.port, dbParam.db);
            // 校验是否有此类
            Class<?> aClass = Class.forName("org.postgresql.Driver");
            System.out.println(pgUrl);

            // ---------- 执行 ----------
            List<String[]> list = new ArrayList<>();
            ResultBean<String[]> result = new ResultBean<>();

            pgConn = DriverManager.getConnection(pgUrl, dbParam.dbuser, dbParam.dbpwd);

            PreparedStatement preparedStatement = pgConn.prepareStatement(dbParam.sql);
            if (isEditSql(dbParam.sql)) {
                int execute = preparedStatement.executeUpdate();
                list.add(new String[] {String.valueOf(execute), String.valueOf(System.currentTimeMillis())});
                result.setCode(200);
                result.setRow(new String[]{"执行结果", "操作时间"});
                result.setRows(list);
                return result;
            }
            boolean execute = preparedStatement.execute();
            ResultSet resultSet = preparedStatement.getResultSet();

            // column name
            String[] line;
            int columnCount = resultSet.getMetaData().getColumnCount();
            result.setRow(line = new String[columnCount]);
            for (int i = 0; i < line.length; i++) {
                line[i] = resultSet.getMetaData().getColumnLabel(i + 1);
            }
            // data
            while (resultSet.next()) {
                list.add(line = new String[columnCount]);
                for (int i = 0; i < line.length; i++) {
                    line[i] = resultSet.getString(i + 1);
                }
            }
            result.setRows(list);
            result.setCode(200);
            return result;
        } catch (Exception e) {
            if (-1 == bindPort) {
                ResultBean<String[]> result = new ResultBean<>();
                result.setCode(200);
                result.setRow(new String[]{"已经停止: " + String.valueOf(System.currentTimeMillis())});
                return result;
            }
            return gatherException(e);
        } finally {
            close();
        }
    }

    public ResultBean<String[]> gatherException(Throwable e) {
        List<String[]> list = new ArrayList<>();
        StackTraceElement[] st = e.getStackTrace();
        for (int i = 0; i < st.length; i++) {
            list.add(new String[]{"    " + st[i].toString()});
        }
        if (null != e.getCause()) {
            st = e.getCause().getStackTrace();
            list.add(new String[]{e.getCause().getMessage()});
            for (int i = 0; i < st.length; i++) {
                list.add(new String[]{"    " + st[i].toString()});
            }
        }
        ResultBean<String[]> result = new ResultBean<>();
        result.setCode(500);
        result.setRow(new String[]{e.getMessage()});
        result.setRows(list);
        return result;
    }

    public boolean isEditSql(String sql) {
        for (String line : sql.split("\n")) {
            if (!(line = line.trim()).isEmpty() && !line.startsWith("--")) {
                line = line.split(" ")[0].toLowerCase();
                for (String s : EDIT_SQL_START) {
                    if (line.equals(s)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
