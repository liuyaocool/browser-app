package prv.liuyao.bsutils.utils;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.RemovalNotification;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

public class Cache {

    private static final com.google.common.cache.Cache CACHE = CacheBuilder.newBuilder()
            .expireAfterAccess(5, TimeUnit.MINUTES)
            .removalListener(Cache::removalListener)
            .build();

    private static void removalListener(RemovalNotification<String, Object> notification) {
        System.out.println("CacheUtil.CACHE.delete: " + notification.getKey());
        if (notification.getValue() instanceof AutoCloseable) {
            try {
                ((AutoCloseable) notification.getValue()).close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        /**
         *  使用`CacheBuilder`构建的缓存不会“自动”执行清理和逐出值，也不会在值到期后立即执行或逐出任何类型。
         * 相反，它在写入操作期间执行少量维护，或者在写入很少的情况下偶尔执行读取操作。
         *  它并没有通过在后台起一个线程，不停去轮询。在get时判断是否过期。如果一直不访问，可能存在内存泄漏问题。
         */
        CACHE.cleanUp();
    }

    public static void set(String key, Object val) {
        CACHE.put(key, val);
    }

    public static <T> T get(String key, Supplier<T> loader) {
        Object o = get(key);
        if (null == o) synchronized (CACHE) {
            if (null == (o = get(key))) set(key, o = loader.get());
        }
        return (T) o;
    }

    public static <T> T get(String key) {
        return (T) CACHE.getIfPresent(key);
    }

    public static void invalidCache(String key) {
        CACHE.invalidate(key);
    }

}
