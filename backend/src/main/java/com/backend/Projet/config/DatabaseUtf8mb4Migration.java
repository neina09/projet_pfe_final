package com.backend.Projet.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DatabaseUtf8mb4Migration {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Bean
    ApplicationRunner migrateDatabaseCharsetToUtf8mb4() {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                String databaseProductName = connection.getMetaData().getDatabaseProductName();
                if (!"MySQL".equalsIgnoreCase(databaseProductName)) {
                    return;
                }

                jdbcTemplate.execute("ALTER DATABASE `" + connection.getCatalog() + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

                List<String> tables = jdbcTemplate.queryForList("""
                        SELECT table_name
                        FROM information_schema.tables
                        WHERE table_schema = DATABASE()
                          AND table_type = 'BASE TABLE'
                        """, String.class);

                for (String tableName : tables) {
                    jdbcTemplate.execute("ALTER TABLE `" + tableName + "` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                }
            } catch (Exception exception) {
                log.warn("Could not migrate database/tables to utf8mb4: {}", exception.getMessage());
            }
        };
    }
}
