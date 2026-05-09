package com.backend.Projet.service;

import com.backend.Projet.exception.TooManyRequestsException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthRateLimitService {

    private final Map<String, Deque<Instant>> requestBuckets = new ConcurrentHashMap<>();

    public void checkRateLimit(String key, int maxAttempts, Duration window, String message) {
        assertWithinRateLimit(key, maxAttempts, window, message);
        registerAttempt(key, window);
    }

    public void assertWithinRateLimit(String key, int maxAttempts, Duration window, String message) {
        Instant now = Instant.now();
        Deque<Instant> bucket = requestBuckets.computeIfAbsent(key, ignored -> new ArrayDeque<>());

        synchronized (bucket) {
            pruneExpired(bucket, now, window);

            if (bucket.size() >= maxAttempts) {
                throw new TooManyRequestsException(message);
            }
        }
    }

    public void registerAttempt(String key, Duration window) {
        Instant now = Instant.now();
        Deque<Instant> bucket = requestBuckets.computeIfAbsent(key, ignored -> new ArrayDeque<>());

        synchronized (bucket) {
            pruneExpired(bucket, now, window);
            bucket.addLast(now);
        }
    }

    public void reset(String key) {
        requestBuckets.remove(key);
    }

    private void pruneExpired(Deque<Instant> bucket, Instant now, Duration window) {
        Instant cutoff = now.minus(window);
        while (!bucket.isEmpty() && bucket.peekFirst().isBefore(cutoff)) {
            bucket.pollFirst();
        }
    }

    @Scheduled(fixedDelayString = "${app.security.rate-limit.cleanup-interval-ms:300000}")
    public void cleanupExpiredBuckets() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(24));
        requestBuckets.entrySet().removeIf((entry) -> {
            Deque<Instant> bucket = entry.getValue();
            synchronized (bucket) {
                while (!bucket.isEmpty() && bucket.peekFirst().isBefore(cutoff)) {
                    bucket.pollFirst();
                }
                return bucket.isEmpty();
            }
        });
    }
}
