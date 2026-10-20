import com.tuap.backend.BackendApplication;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;
import org.springframework.boot.SpringApplication;
public class BetaLocal {
  public static void main(String[] args) throws Exception {
    var context = SpringApplication.run(BackendApplication.class, args);
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
