import java.sql.*;

public class DbInspector {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:mysql://localhost:3306/db_backend?useSSL=false&allowPublicKeyRetrieval=true";
        String user = "root";
        String password = ""; 
        
        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            inspectTable(conn, "workers");
            inspectTable(conn, "bookings");
            inspectTable(conn, "tasks");
        } catch (SQLException e) {
            System.err.println("Connection failed: " + e.getMessage());
        }
    }

    private static void inspectTable(Connection conn, String tableName) throws SQLException {
        System.out.println("\n--- Table: " + tableName + " ---");
        DatabaseMetaData meta = conn.getMetaData();
        try (ResultSet rs = meta.getColumns(null, null, tableName, null)) {
            boolean found = false;
            while (rs.next()) {
                found = true;
                String name = rs.getString("COLUMN_NAME");
                String type = rs.getString("TYPE_NAME");
                String nullable = rs.getString("IS_NULLABLE");
                String def = rs.getString("COLUMN_DEF");
                System.out.printf("%-20s | %-10s | Nullable: %-5s | Default: %s%n", name, type, nullable, def);
            }
            if (!found) {
                System.out.println("Table not found or no columns.");
            }
        }
    }
}
