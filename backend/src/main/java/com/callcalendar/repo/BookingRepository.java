package com.callcalendar.repo;

import com.callcalendar.domain.Booking;
import com.callcalendar.domain.Interval;
import com.callcalendar.domain.SlotUnavailableException;
import jakarta.inject.Singleton;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.sql.DataSource;

@Singleton
public class BookingRepository {

  /** SQLState reported by the booking_no_active_overlap exclusion constraint (ADR-0006). */
  private static final String EXCLUSION_VIOLATION = "23P01";

  private final DataSource dataSource;

  public BookingRepository(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public void insert(
      String guestName, String guestEmail, Instant start, Instant end, String cancellationToken) {
    String sql =
        "INSERT INTO booking (guest_name, guest_email, start_at, end_at, state, cancellation_token)"
            + " VALUES (?, ?, ?, ?, 'active', ?)";
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setString(1, guestName);
      statement.setString(2, guestEmail);
      statement.setTimestamp(3, Timestamp.from(start));
      statement.setTimestamp(4, Timestamp.from(end));
      statement.setString(5, cancellationToken);
      statement.executeUpdate();
    } catch (SQLException e) {
      if (EXCLUSION_VIOLATION.equals(e.getSQLState())) {
        throw new SlotUnavailableException("slot no longer available");
      }
      throw new IllegalStateException("failed to insert booking", e);
    }
  }

  public Optional<Booking> findByToken(String token) {
    String sql =
        "SELECT id, guest_name, guest_email, start_at, end_at, state, cancellation_token"
            + " FROM booking WHERE cancellation_token = ?";
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setString(1, token);
      try (ResultSet rs = statement.executeQuery()) {
        if (!rs.next()) {
          return Optional.empty();
        }
        return Optional.of(
            new Booking(
                rs.getLong("id"),
                rs.getString("guest_name"),
                rs.getString("guest_email"),
                rs.getTimestamp("start_at").toInstant(),
                rs.getTimestamp("end_at").toInstant(),
                rs.getString("state"),
                rs.getString("cancellation_token")));
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read booking", e);
    }
  }

  /** Flips an active booking to cancelled; returns true when a row was updated. */
  public boolean markCancelled(long id) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "UPDATE booking SET state = 'cancelled' WHERE id = ? AND state = 'active'")) {
      statement.setLong(1, id);
      return statement.executeUpdate() > 0;
    } catch (SQLException e) {
      throw new IllegalStateException("failed to cancel booking", e);
    }
  }

  /** Intervals covered by ACTIVE bookings overlapping [from, to). */
  public List<Interval> findActiveOverlapping(Instant from, Instant to) {
    String sql =
        "SELECT start_at, end_at FROM booking WHERE state = 'active'"
            + " AND tstzrange(start_at, end_at, '[)') && tstzrange(?, ?, '[)')";
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setTimestamp(1, Timestamp.from(from));
      statement.setTimestamp(2, Timestamp.from(to));
      try (ResultSet rs = statement.executeQuery()) {
        List<Interval> busy = new ArrayList<>();
        while (rs.next()) {
          busy.add(
              new Interval(
                  rs.getTimestamp("start_at").toInstant(), rs.getTimestamp("end_at").toInstant()));
        }
        return busy;
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read active bookings", e);
    }
  }
}
