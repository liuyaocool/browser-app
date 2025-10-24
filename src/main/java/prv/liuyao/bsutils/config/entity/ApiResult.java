package prv.liuyao.bsutils.config.entity;

import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(chain = true)
public class ApiResult<T> {
    public int code;
    public String msg;
    public T data;

    public ApiResult(int code) {
        this.code = code;
    }

}
