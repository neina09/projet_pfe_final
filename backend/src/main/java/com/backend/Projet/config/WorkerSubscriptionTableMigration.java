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
public class WorkerSubscriptionTableMigration {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Bean
    ApplicationRunner migrateWorkerSubscriptionsTable() {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                String databaseProductName = connection.getMetaData().getDatabaseProductName();
                if (!"MySQL".equalsIgnoreCase(databaseProductName)) {
                    return;
                }

                Integer tableCount = jdbcTemplate.queryForObject("""
                        SELECT COUNT(*)
                        FROM information_schema.tables
                        WHERE table_schema = DATABASE()
                          AND table_name = 'worker_subscriptions'
                        """, Integer.class);

                if (tableCount != null && tableCount == 0) {
                    jdbcTemplate.execute("""
                            CREATE TABLE worker_subscriptions (
                                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                worker_id BIGINT NOT NULL UNIQUE,
                                payment_method VARCHAR(30) NOT NULL,
                                payment_status VARCHAR(30) NOT NULL,
                                amount DECIMAL(10,2) NOT NULL,
                                duration_months INT NOT NULL,
                                receipt_url VARCHAR(2048) NULL,
                                transfer_reference VARCHAR(120) NULL UNIQUE,
                                verification_notes VARCHAR(500) NULL,
                                verified_at DATETIME NULL,
                                starts_at DATETIME NULL,
                                ends_at DATETIME NULL,
                                active BIT NOT NULL,
                                CONSTRAINT fk_worker_subscription_worker
                                    FOREIGN KEY (worker_id) REFERENCES workers(id)
                            )
                            """);
                }
            } catch (Exception exception) {
                log.warn("Could not create worker_subscriptions table: {}", exception.getMessage());
            }
        };
    }
}
