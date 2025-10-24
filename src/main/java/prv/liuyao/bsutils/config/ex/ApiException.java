package prv.liuyao.bsutils.config.ex;

import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(chain = true)
public class ApiException extends RuntimeException {

    private int code;

    public ApiException(int code, Throwable cause, String format, Object... args) {
        super(null == format ? "" : String.format(format, args), cause);
        this.code = code;
    }

}
