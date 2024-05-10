package prv.liuyao.bsutils.utils;

import java.text.SimpleDateFormat;
import java.util.Date;

public class DateUtil {

    public static final String FORMAT_TIME = "HH:mm:ss";
    //    yyyy-M-d HH:mm:ss
    public static final String FORMAT_DATETIME = "yyyy-MM-dd HH:mm:ss";
    public static final String FORMAT_DATE = "yyyy-MM-dd";//

    public static String formatDate(Date date){
        return format(date, FORMAT_DATE);
    }

    public static String formatDatetime(Date date){
        return format(date, FORMAT_DATETIME);
    }

    public static String format(Date date, String format){
        return date == null ? null : new SimpleDateFormat(format).format(date);
    }

}
