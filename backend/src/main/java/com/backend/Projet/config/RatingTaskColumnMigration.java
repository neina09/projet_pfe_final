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
public class RatingTaskColumnMigration {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Bean
    ApplicationRunner migrateRatingTaskColumn() {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                String databaseProductName = connection.getMetaData().getDatabaseProductName();
                if (!"MySQL".equalsIgnoreCase(databaseProductName)) {
                    return;
                }

                jdbcTemplate.execute("""
                        ALTER TABLE ratings
                        MODIFY COLUMN booking_id BIGINT NULL
                        """);

                Integer taskColumnCount = jdbcTemplate.queryForObject("""
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'ratings'
                          AND column_name = 'task_id'
                        """, Integer.class);

                if (taskColumnCount != null && taskColumnCount == 0) {
                    jdbcTemplate.execute("""
                            ALTER TABLE ratings
                            ADD COLUMN task_id BIGINT NULL UNIQUE
                            """);
                }

                Integer taskIndexCount = jdbcTemplate.queryForObject("""
                        SELECT COUNT(*)
                        FROM information_schema.statistics
                        WHERE table_schema = DATABASE()
                          AND table_name = 'ratings'
                          AND index_name = 'idx_rating_task_id'
                        """, Integer.class);

                if (taskIndexCount != null && taskIndexCount == 0) {
                    jdbcTemplate.execute("""
                            CREATE INDEX idx_rating_task_id
                            ON ratings (task_id)
                            """);
                }

                Integer fkCount = jdbcTemplate.queryForObject("""
                        SELECT COUNT(*)
                        FROM information_schema.referential_constraints
                        WHERE constraint_schema = DATABASE()
                          AND table_name = 'ratings'
                          AND constraint_name = 'fk_ratings_task_id'
                        """, Integer.class);

                if (fkCount != null && fkCount == 0) {
                    jdbcTemplate.execute("""
                            ALTER TABLE ratings
                            ADD CONSTRAINT fk_ratings_task_id
                            FOREIGN KEY (task_id) REFERENCES tasks(id)
                            """);
                }
            } catch (Exception exception) {
                log.warn("Could not normalize ratings task support: {}", exception.getMessage());
            }
        };
    }
}
