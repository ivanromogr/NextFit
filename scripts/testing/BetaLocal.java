import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.tuap.backend.BackendApplication;
import com.tuap.backend.auth.EmailChangeNotifier;
import com.tuap.backend.auth.EmailPasswordResetNotifier;
import com.tuap.backend.auth.EmailService;
import com.tuap.backend.auth.PasswordResetNotifier;
import com.tuap.backend.config.EmailProperties;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/** Disposable fixture, deliberately outside the backend source tree and JAR. */
public class BetaLocal {
  @Configuration(proxyBeanMethods = false)
  public static class LocalDelivery {
    @Bean(destroyMethod = "close")
    LocalMailbox localMailbox() throws Exception { return new LocalMailbox(); }
    @Bean @Primary
    PasswordResetNotifier localPasswordNotifier(LocalMailbox mailbox) {
      return new EmailPasswordResetNotifier(mailbox, properties());
    }
    @Bean
    EmailChangeNotifier localEmailChangeNotifier(LocalMailbox mailbox) {
      return new EmailChangeNotifier(mailbox, properties());
    }
    private EmailProperties properties() {
      var properties = new EmailProperties();
      properties.setPasswordResetUrl("http://127.0.0.1:4181/reset-password");
      properties.setEmailChangeConfirmUrl("http://127.0.0.1:4181/confirm-email-change");
      return properties;
    }
  }

  /** In-memory loopback delivery only: no provider, filesystem messages or logs. */
  public static class LocalMailbox implements EmailService, AutoCloseable {
    private final ConcurrentHashMap<String, Mail> messages = new ConcurrentHashMap<>();
    private final HttpServer server;
    private record Mail(String to, String subject, String html) {}
    LocalMailbox() throws Exception {
      server = HttpServer.create(new InetSocketAddress("127.0.0.1", 18081), 0);
      server.createContext("/next", exchange -> {
        String query = exchange.getRequestURI().getRawQuery();
        String to = query != null && query.startsWith("to=")
            ? URLDecoder.decode(query.substring(3), StandardCharsets.UTF_8) : "";
        Mail mail = "GET".equals(exchange.getRequestMethod()) ? messages.remove(to) : null;
        byte[] body = mail == null ? new byte[0] : new ObjectMapper().writeValueAsBytes(mail);
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(mail == null ? 404 : 200, body.length);
        try (var output = exchange.getResponseBody()) { output.write(body); }
      });
      server.start();
    }
    @Override public void send(String to, String subject, String html) {
      if (to == null || !to.endsWith("@example.invalid")) {
        throw new IllegalArgumentException("Local delivery requires a fictional example.invalid address");
      }
      messages.put(to, new Mail(to, subject, html));
    }
    @Override public void close() { server.stop(0); messages.clear(); }
  }

  public static void main(String[] args) throws Exception {
    var settings = Arrays.asList(args);
    if (!settings.contains("--spring.datasource.url=jdbc:h2:mem:nextfit-beta-browser;DB_CLOSE_DELAY=-1")
        || !settings.contains("--spring.profiles.active=test")
        || !settings.contains("--server.address=127.0.0.1")
        || !settings.contains("--app.email.enabled=false")) {
      throw new IllegalArgumentException("This fixture requires the isolated local launcher");
    }
    var context = SpringApplication.run(new Class<?>[]{BackendApplication.class, LocalDelivery.class}, args);
    var exercise = new Ejercicio();
    exercise.setNombre("Sentadilla beta local");
    exercise.setNombreTraducido("Sentadilla beta local");
    exercise.setGrupoMuscular("PIERNA");
    exercise.setEquipamiento("Peso corporal");
    context.getBean(EjercicioDAO.class).saveAndFlush(exercise);
    var folder = java.nio.file.Path.of(System.getProperty("java.io.tmpdir"), "nextfit-beta-local");
    java.nio.file.Files.createDirectories(folder);
    java.nio.file.Files.writeString(folder.resolve("ready"), "isolated-h2-fixture");
  }
}
