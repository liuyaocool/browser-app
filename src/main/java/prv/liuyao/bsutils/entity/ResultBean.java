package prv.liuyao.bsutils.entity;

import lombok.Getter;
import lombok.Setter;

import java.util.Collection;

@Setter
@Getter
public class ResultBean<T> {

    private int code;
    private String msg;
    private T row;
    private Collection<T> rows;

}
