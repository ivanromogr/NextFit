package com.tuap.backend.auth;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty; import org.springframework.stereotype.Service;
@Service @ConditionalOnProperty(prefix="app.email",name="enabled",havingValue="false",matchIfMissing=true) public class DisabledEmailService implements EmailService { public void send(String to,String subject,String html){} }
