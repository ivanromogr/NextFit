package com.tuap.backend.auth;
import static org.junit.jupiter.api.Assertions.*; import static org.mockito.Mockito.*; import org.junit.jupiter.api.Test; import org.mockito.ArgumentCaptor; import com.tuap.backend.config.EmailProperties;
class EmailPasswordResetNotifierTest {
 @Test void buildsEncodedUrlAndSafeContent(){EmailService email=mock(EmailService.class);EmailProperties p=new EmailProperties();p.setPasswordResetUrl("https://app.nextfit.test/reset-password");EmailPasswordResetNotifier notifier=new EmailPasswordResetNotifier(email,p);notifier.notifyReset(new AuthenticatedUser(java.util.UUID.randomUUID(),"user@nextfit.test",Role.CLIENTE),"a+b/c?=");ArgumentCaptor<String> html=ArgumentCaptor.forClass(String.class);verify(email).send(eq("user@nextfit.test"),eq("Restablece tu contraseña de NextFit"),html.capture());assertTrue(html.getValue().contains("token=a%2Bb%2Fc%3F%3D"));assertTrue(html.getValue().contains("30 minutos"));assertTrue(html.getValue().contains("ignora"));}
 @Test void disabledServiceIsNoop(){new DisabledEmailService().send("user@nextfit.test","subject","html");}
}
