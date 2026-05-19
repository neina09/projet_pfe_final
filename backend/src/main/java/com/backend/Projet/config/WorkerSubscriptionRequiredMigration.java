package com.backend.Projet.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class WorkerSubscriptionRequiredMigration {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Bean
    ApplicationRunner migrateWorkerSubscriptionRequiredColumn() {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                String databaseProductName = connection.getMetaData().getDatabaseProductName();
                if (!"MySQL".equalsIgnoreCase(databaseProductName)) {
                    return;
                }

                Integer columnCount = jdbcTemplate.queryForObject("""
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'workers'
                          AND column_name = 'subscription_required'
                        """, Integer.class);

                if (columnCount != null && columnCount == 0) {
                    jdbcTemplate.execute("""
                            ALTER TABLE workers
                            ADD COLUMN subscription_required BIT NOT NULL DEFAULT b'0'
                            """);
                }
            } catch (Exception exception) {
                log.warn("Could not add workers.subscription_required column: {}", exception.getMessage());
            }
        };
    }
}
