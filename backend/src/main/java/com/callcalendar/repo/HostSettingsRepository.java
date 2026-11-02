package com.callcalendar.repo;

import com.callcalendar.domain.HostSettings;
import jakarta.inject.Singleton;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashSet;
import java.util.Set;
import javax.sql.DataSource;

@Singleton
public class HostSettingsRepository {

  private final DataSource dataSource;

  public HostSettingsRepository(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  /** The single host_settings row; the schema guarantees exactly one. */
  public HostSettings findSingle() {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT timezone, allowed_duration_minutes FROM host_settings WHERE id = 1");
        ResultSet rs = statement.executeQuery()) {
      if (!rs.next()) {
        throw new IllegalStateException("host_settings row missing; Liquibase seed did not run");
      }
      return new HostSettings(
          rs.getString("timezone"), toSet(rs.getArray("allowed_duration_minutes")));
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read host_settings", e);
    }
  }

  private static Set<Integer> toSet(Array durations) throws SQLException {
    Set<Integer> result = new LinkedHashSet<>();
    for (Object value : (Object[]) durations.getArray()) {
      result.add(((Number) value).intValue());
    }
    return Set.copyOf(result);
  }
}
