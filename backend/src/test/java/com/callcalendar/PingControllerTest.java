package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

@MicronautTest
class PingControllerTest {

  @Inject
  @Client("/")
  HttpClient client;

  @Test
  void pingRespondsPong() {
    String body = client.toBlocking().retrieve(HttpRequest.GET("/api/ping"), String.class);
    assertEquals("pong", body);
  }
}
