package prv.liuyao.bsutils.config.handler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import prv.liuyao.bsutils.config.entity.ApiResult;
import prv.liuyao.bsutils.config.ex.ApiException;
import prv.liuyao.bsutils.global.GlobalConstant;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ApiResult<String> apiEx (ApiException e, HttpServletRequest q, HttpServletResponse p) {
        log.error("api({}) exception: {}", q.getRequestURI(), e.getMessage(), e);
        setResponseHeader(p, e.getCode());
        return new ApiResult<String>(e.getCode()).setMsg(e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ApiResult<String> glEx(Exception e, HttpServletRequest q, HttpServletResponse p) {
        log.error("global api({}) exception: {}", q.getRequestURI(), e.getMessage(), e);
        setResponseHeader(p, 500);
        return new ApiResult<String>(500).setMsg(e.getMessage());
    }

    private void setResponseHeader(HttpServletResponse response, int code) {
        response.setCharacterEncoding(GlobalConstant.DEFAULT_CHARSET.toString());
        response.setContentType("application/json;charset=utf-8");
        response.setStatus(code);
    }
}