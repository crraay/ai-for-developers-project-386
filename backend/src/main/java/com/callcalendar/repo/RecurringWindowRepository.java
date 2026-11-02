package com.callcalendar.repo;

import com.callcalendar.domain.RecurringWindow;
import jakarta.inject.Singleton;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;

@Singleton
public class RecurringWindowRepository {

  private final DataSource dataSource;

  public RecurringWindowRepository(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public List<RecurringWindow> findAll() {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT dtstart_local, dtend_local, rrule FROM recurring_window ORDER BY id");
        ResultSet rs = statement.executeQuery()) {
      List<RecurringWindow> windows = new ArrayList<>();
      while (rs.next()) {
        windows.add(
            new RecurringWindow(
                rs.getTimestamp("dtstart_local").toLocalDateTime(),
                rs.getTimestamp("dtend_local").toLocalDateTime(),
                rs.getString("rrule")));
      }
      return windows;
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read recurring_window", e);
    }
  }
}
