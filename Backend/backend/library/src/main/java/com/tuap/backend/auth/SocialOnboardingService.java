package com.tuap.backend.auth;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.AuthIdentity;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.PendingSocialAuth;
import com.tuap.backend.persistencia.AuthIdentityDAO;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

/** Completes a new Google or Apple account from a server-issued pending social identity. */
@Service
public class SocialOnboardingService {
    private final PendingSocialAuthService pending;
    private final ClienteDAO clientes;
    private final EntrenadorDAO entrenadores;
    private final AuthIdentityService identities;
    private final AuthIdentityDAO identityDao;
    private final ConsentService consents;

    public SocialOnboardingService(PendingSocialAuthService pending, ClienteDAO clientes, EntrenadorDAO entrenadores,
            AuthIdentityService identities, AuthIdentityDAO identityDao, ConsentService consents) {
        this.pending = pending;
        this.clientes = clientes;
        this.entrenadores = entrenadores;
        this.identities = identities;
        this.identityDao = identityDao;
        this.consents = consents;
    }

    @Transactional
    public AuthenticatedUser complete(AuthProvider expectedProvider, SocialOnboardingRequest request) {
        validateRequest(expectedProvider, request);
        PendingSocialAuth state = pending.findValid(request.pendingToken());
        if (state.getProvider() != expectedProvider) throw new SocialProviderMismatchException();
        if (identityDao.findByProviderAndProviderSubject(expectedProvider, state.getProviderSubject()).isPresent()) {
            throw new SocialIdentityAlreadyLinkedException();
        }

        String email = normalizedRequiredEmail(state.getVerifiedEmail());
        if (clientes.findByEmail(email).isPresent() || entrenadores.findByEmail(email).isPresent()) {
            throw new EmailAlreadyInUseException();
        }

        AuthenticatedUser user = createUser(request, email);
        try {
            identities.linkIdentity(user, expectedProvider, state.getProviderSubject(), email);
        } catch (AuthIdentityConflictException exception) {
            throw new SocialIdentityAlreadyLinkedException();
        }
        consents.recordRegistration(user, true, true, request.marketingConsent());
        pending.consume(state);
        return user;
    }

    private AuthenticatedUser createUser(SocialOnboardingRequest request, String email) {
        if (request.role() == Role.CLIENTE) {
            Cliente client = clientes.save(new Cliente(request.nombre().trim(), request.apellido().trim(), email, null,
                    "ROLE_CLIENTE", 0, 0, 0, "", "", ""));
            return new AuthenticatedUser(client.getId(), email, Role.CLIENTE);
        }
        Entrenador trainer = entrenadores.save(new Entrenador(request.nombre().trim(), request.apellido().trim(), email,
                null, "ROLE_ENTRENADOR", "", 0, "", 0, "", "", "", ""));
        return new AuthenticatedUser(trainer.getId(), email, Role.ENTRENADOR);
    }

    private static void validateRequest(AuthProvider expectedProvider, SocialOnboardingRequest request) {
        if (expectedProvider == null || expectedProvider == AuthProvider.LOCAL || request == null || request.role() == null
                || blank(request.nombre()) || blank(request.apellido()) || !request.acceptTerms() || !request.acceptPrivacy()) {
            throw new IllegalArgumentException("Solicitud de registro social inválida");
        }
    }

    private static String normalizedRequiredEmail(String email) {
        if (email == null || email.isBlank()) throw new SocialEmailRequiredException();
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
