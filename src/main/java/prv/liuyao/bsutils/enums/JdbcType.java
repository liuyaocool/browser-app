package prv.liuyao.bsutils.enums;

import java.net.URLDecoder;
import java.text.MessageFormat;

public enum JdbcType {
    POSTGRESQL("jdbc:postgresql://{0}:{1}/{2}"),
    MYSQL("jdbc:mysql://{0}:{1}/{2}?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=GMT%2B8"),

    ;

    private String driverUrl;

    JdbcType(String driverUrl) {
        this.driverUrl = driverUrl;
    }

    public String getJdbcUrl(String host, int port, String db) {
        return MessageFormat.format(this.driverUrl, host, String.valueOf(port), db);
    }

    public static void main(String[] args) {
        System.out.println(MYSQL.getJdbcUrl("127.0.0.1", 3306, "mysql"));
    }

}
