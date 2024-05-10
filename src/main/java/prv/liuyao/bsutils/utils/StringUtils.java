package prv.liuyao.bsutils.utils;

public class StringUtils {

    public static boolean isEmpty(CharSequence cs) {
        int strLen = length(cs);
        if (strLen == 0) return true;
        for(int i = 0; i < strLen; ++i)
            if (!Character.isWhitespace(cs.charAt(i)))
                return false;
        return true;
    }

    public static int length(CharSequence cs) {
        return null == cs ? 0 : cs.length();
    }

}
