package com.callcalendar.repo;

import com.callcalendar.domain.BookingType;
import jakarta.inject.Singleton;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.sql.DataSource;

/**
 * Reads and writes the {@code booking_type} table (Issue #28). The guest surface exposes active rows
 * sorted by {@code sort_order}; the host surface uses the same table unrestrictedly for CRUD.
 */
@Singleton
public class BookingTypeRepository {

  private static final String COLUMNS =
      "id, title, description, duration_minutes, sort_order, active";

  private final DataSource dataSource;

  public BookingTypeRepository(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  /** Active types only, ordered for the picker (lowest sort_order first). */
  public List<BookingType> findActive() {
    return findAllWhere("WHERE active = TRUE ORDER BY sort_order ASC, id ASC");
  }

  /** Host-side listing: every row, regardless of state, newest first. */
  public List<BookingType> findAll() {
    return findAllWhere("ORDER BY active DESC, sort_order ASC, id ASC");
  }

  private List<BookingType> findAllWhere(String whereClause) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement("SELECT " + COLUMNS + " FROM booking_type " + whereClause);
        ResultSet rs = statement.executeQuery()) {
      List<BookingType> types = new ArrayList<>();
      while (rs.next()) {
        types.add(read(rs));
      }
      return types;
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read booking_type", e);
    }
  }

  public Optional<BookingType> findById(long id) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT " + COLUMNS + " FROM booking_type WHERE id = ?")) {
      statement.setLong(1, id);
      try (ResultSet rs = statement.executeQuery()) {
        return rs.next() ? Optional.of(read(rs)) : Optional.empty();
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read booking_type", e);
    }
  }

  /**
   * Inserts a new type and returns it with the database-assigned id. The supplied
   * {@code sortOrder} is renormalised to {@code (max + 10)} so a freshly created type lands at the
   * end of the picker without the host having to pick an order.
   */
  public BookingType insert(String title, String description, int durationMinutes) {
    int sortOrder = nextSortOrder();
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "INSERT INTO booking_type (title, description, duration_minutes, sort_order, active)"
                    + " VALUES (?, ?, ?, ?, TRUE)",
                Statement.RETURN_GENERATED_KEYS)) {
      statement.setString(1, title);
      statement.setString(2, description);
      statement.setInt(3, durationMinutes);
      statement.setInt(4, sortOrder);
      statement.executeUpdate();
      try (ResultSet keys = statement.getGeneratedKeys()) {
        keys.next();
        long id = keys.getLong(1);
        return new BookingType(id, title, description, durationMinutes, sortOrder, true);
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to insert booking_type", e);
    }
  }

  /**
   * Updates every editable field; returns the new state, or empty when the row was deleted under
   * the host's feet.
   */
  public Optional<BookingType> update(
      long id, String title, String description, int durationMinutes, int sortOrder, boolean active) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "UPDATE booking_type SET title = ?, description = ?, duration_minutes = ?,"
                    + " sort_order = ?, active = ? WHERE id = ?")) {
      statement.setString(1, title);
      statement.setString(2, description);
      statement.setInt(3, durationMinutes);
      statement.setInt(4, sortOrder);
      statement.setBoolean(5, active);
      statement.setLong(6, id);
      if (statement.executeUpdate() == 0) {
        return Optional.empty();
      }
      return Optional.of(new BookingType(id, title, description, durationMinutes, sortOrder, active));
    } catch (SQLException e) {
      throw new IllegalStateException("failed to update booking_type", e);
    }
  }

  public boolean deleteById(long id) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement("DELETE FROM booking_type WHERE id = ?")) {
      statement.setLong(1, id);
      return statement.executeUpdate() > 0;
    } catch (SQLException e) {
      throw new IllegalStateException("failed to delete booking_type", e);
    }
  }

  private int nextSortOrder() {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT COALESCE(MAX(sort_order), 0) + 10 FROM booking_type");
        ResultSet rs = statement.executeQuery()) {
      rs.next();
      return rs.getInt(1);
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read booking_type sort_order", e);
    }
  }

  private static BookingType read(ResultSet rs) throws SQLException {
    return new BookingType(
        rs.getLong("id"),
        rs.getString("title"),
        rs.getString("description"),
        rs.getInt("duration_minutes"),
        rs.getInt("sort_order"),
        rs.getBoolean("active"));
  }
}
