-- Initial PostgreSQL schema for EMPTY databases only.
-- Existing databases require an explicitly reviewed baseline at version 1.
-- Derived from the application mappings and validated with PostgreSQL 16.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE public.administrador (
    id uuid NOT NULL,
    nivel_acceso character varying(255) NOT NULL
);

CREATE TABLE public.auth_identities (
    active boolean NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    last_used_at timestamp(6) with time zone,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(20) NOT NULL,
    role character varying(20) NOT NULL,
    provider_subject character varying(512) NOT NULL,
    email_at_link_time character varying(255),
    CONSTRAINT auth_identities_provider_check CHECK (((provider)::text = ANY ((ARRAY['LOCAL'::character varying, 'GOOGLE'::character varying, 'APPLE'::character varying])::text[]))),
    CONSTRAINT auth_identities_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[])))
);

CREATE TABLE public.chat (
    cliente_id uuid NOT NULL,
    clienteid uuid,
    entrenador_id uuid NOT NULL,
    entrenadorid uuid,
    id uuid NOT NULL
);

CREATE TABLE public.chat_blocks (
    created_at timestamp(6) with time zone NOT NULL,
    owner_id uuid NOT NULL,
    target_id uuid NOT NULL
);

CREATE TABLE public.chat_reports (
    created_at timestamp(6) with time zone NOT NULL,
    reviewed_at timestamp(6) with time zone,
    version bigint NOT NULL,
    message_id uuid NOT NULL,
    reported_user_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    reason character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    CONSTRAINT chat_reports_reason_check CHECK (((reason)::text = ANY ((ARRAY['HARASSMENT'::character varying, 'SPAM'::character varying, 'INAPPROPRIATE'::character varying, 'OTHER'::character varying])::text[])))
);

CREATE TABLE public.chat_restrictions (
    active boolean NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    message_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.cliente (
    active boolean NOT NULL,
    altura integer NOT NULL,
    edad integer NOT NULL,
    peso double precision NOT NULL,
    deleted_at timestamp(6) with time zone,
    entrenador_id uuid,
    id uuid NOT NULL,
    apellido character varying(255) NOT NULL,
    contrasena character varying(255),
    email character varying(255) NOT NULL,
    foto_perfil character varying(255),
    genero character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    objetivo character varying(255) NOT NULL,
    rol character varying(255) NOT NULL
);

CREATE TABLE public.detalle_rutina (
    dias integer NOT NULL,
    peso real,
    repeticiones integer NOT NULL,
    rpe integer,
    series integer NOT NULL,
    ejercicio_id uuid NOT NULL,
    id uuid NOT NULL,
    rutina_id uuid NOT NULL,
    notas character varying(255)
);

CREATE TABLE public.ejercicio (
    activo boolean,
    tiene_animacion boolean,
    id uuid NOT NULL,
    api_id character varying(255),
    consejos_tecnicos text,
    descripcion_corta character varying(255),
    dificultad character varying(255),
    equipamiento character varying(255) NOT NULL,
    errores_comunes text,
    grupo_muscular character varying(255) NOT NULL,
    imagen_paso1 character varying(255),
    imagen_paso2 character varying(255),
    imagen_paso3 character varying(255),
    imagen_url character varying(255),
    instrucciones text,
    nivel character varying(255),
    nombre character varying(255) NOT NULL,
    nombre_traducido character varying(255),
    origen character varying(255),
    parte_cuerpo character varying(255),
    slug character varying(255),
    subgrupo_muscular character varying(255),
    tipo_movimiento character varying(255),
    tipo_visual character varying(255),
    video_url character varying(255)
);

CREATE TABLE public.email_change_tokens (
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    token_hash character varying(64) NOT NULL,
    new_email character varying(255) NOT NULL,
    CONSTRAINT email_change_tokens_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[])))
);

CREATE TABLE public.entrenador (
    active boolean NOT NULL,
    anios_experiencia integer,
    edad integer,
    perfil_publico boolean,
    tarifa_mensual double precision,
    deleted_at timestamp(6) with time zone,
    id uuid NOT NULL,
    descripcion_perfil character varying(1000),
    apellido character varying(255) NOT NULL,
    biografia text,
    contrasena character varying(255),
    email character varying(255) NOT NULL,
    especialidad character varying(255) NOT NULL,
    formacion character varying(255),
    foto_perfil character varying(255),
    genero character varying(255),
    modalidad_trabajo character varying(255),
    nombre character varying(255) NOT NULL,
    rol character varying(255) NOT NULL,
    titulacion character varying(255),
    titulo_academico character varying(255)
);

CREATE TABLE public.entrenamiento (
    cliente_id uuid NOT NULL,
    entrenador_id uuid NOT NULL,
    id uuid NOT NULL,
    descripcion character varying(255) NOT NULL,
    titulo character varying(255) NOT NULL
);

CREATE TABLE public.evento_calendario (
    completado boolean NOT NULL,
    duracion_segundos integer,
    fecha date NOT NULL,
    volumen_total double precision,
    cliente_id uuid NOT NULL,
    entrenador_id uuid,
    id uuid NOT NULL,
    rutina_id uuid NOT NULL
);

CREATE TABLE public.mensajes (
    leido boolean NOT NULL,
    fecha_hora timestamp(6) without time zone,
    attachment_id uuid,
    destinatario_id uuid,
    id uuid NOT NULL,
    remitente_id uuid,
    archivo_url character varying(255),
    contenido text,
    tipo_archivo character varying(255)
);

CREATE TABLE public.moderation_audit (
    created_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    message_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    target_id uuid NOT NULL,
    note character varying(1000) NOT NULL,
    action character varying(255) NOT NULL,
    operator_role character varying(255) NOT NULL,
    CONSTRAINT moderation_audit_action_check CHECK (((action)::text = ANY ((ARRAY['DISMISS'::character varying, 'CONFIRM'::character varying, 'RESTRICT_CHAT'::character varying, 'LIFT_RESTRICTION'::character varying])::text[]))),
    CONSTRAINT moderation_audit_operator_role_check CHECK (((operator_role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[])))
);

CREATE TABLE public.moderation_operators (
    active boolean NOT NULL,
    user_id uuid NOT NULL,
    role character varying(255) NOT NULL,
    CONSTRAINT moderation_operators_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[])))
);

CREATE TABLE public.password_reset_tokens (
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    used_at timestamp(6) with time zone,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    token_hash character varying(64) NOT NULL,
    CONSTRAINT password_reset_tokens_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[])))
);

CREATE TABLE public.pending_social_auth (
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    display_name character varying(255),
    provider character varying(255) NOT NULL,
    provider_subject character varying(255) NOT NULL,
    verified_email character varying(255),
    CONSTRAINT pending_social_auth_provider_check CHECK (((provider)::text = ANY ((ARRAY['LOCAL'::character varying, 'GOOGLE'::character varying, 'APPLE'::character varying])::text[])))
);

CREATE TABLE public.progreso (
    fecha date NOT NULL,
    pesoactual real NOT NULL,
    pesomaximo real NOT NULL,
    cliente_id uuid NOT NULL,
    clienteid uuid NOT NULL,
    entrenamiento_id uuid NOT NULL,
    entrenamientoid uuid NOT NULL,
    id uuid NOT NULL,
    notas character varying(255) NOT NULL
);

CREATE TABLE public.reauthentication_tokens (
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    purpose character varying(32) NOT NULL,
    token_hash character varying(64) NOT NULL,
    target_provider character varying(255),
    CONSTRAINT reauthentication_tokens_purpose_check CHECK (((purpose)::text = ANY ((ARRAY['IDENTITY_UNLINK'::character varying, 'CREATE_LOCAL_IDENTITY'::character varying])::text[]))),
    CONSTRAINT reauthentication_tokens_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[]))),
    CONSTRAINT reauthentication_tokens_target_provider_check CHECK (((target_provider)::text = ANY ((ARRAY['LOCAL'::character varying, 'GOOGLE'::character varying, 'APPLE'::character varying])::text[])))
);

CREATE TABLE public.refresh_tokens (
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    revoked_at timestamp(6) with time zone,
    rotated_at timestamp(6) with time zone,
    family_id uuid NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_type character varying(20) NOT NULL,
    role character varying(20) NOT NULL,
    replaced_by_hash character varying(64),
    token_hash character varying(64) NOT NULL,
    CONSTRAINT refresh_tokens_client_type_check CHECK (((client_type)::text = ANY ((ARRAY['WEB'::character varying, 'MOBILE'::character varying])::text[]))),
    CONSTRAINT refresh_tokens_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[])))
);

CREATE TABLE public.resenas (
    estrellas integer NOT NULL,
    fecha timestamp(6) without time zone,
    id uuid NOT NULL,
    id_cliente uuid,
    id_entrenador uuid,
    comentario text
);

CREATE TABLE public.rutina (
    es_plantilla boolean,
    cliente_id uuid,
    entrenador_id uuid,
    id uuid NOT NULL,
    creador character varying(255) NOT NULL,
    descripcion character varying(255),
    nivel character varying(255),
    nombre character varying(255),
    objetivo character varying(255)
);

CREATE TABLE public.serie_realizada (
    hecho boolean NOT NULL,
    peso double precision NOT NULL,
    reps integer NOT NULL,
    rpe integer NOT NULL,
    set_index integer NOT NULL,
    volumen_serie double precision NOT NULL,
    ejercicio_id uuid NOT NULL,
    id uuid NOT NULL,
    sesion_id uuid NOT NULL
);

CREATE TABLE public.sesion_entrenamiento (
    duracion_segundos integer NOT NULL,
    volumen_total double precision NOT NULL,
    fecha_hora timestamp(6) without time zone NOT NULL,
    cliente_id uuid NOT NULL,
    evento_calendario_id uuid,
    id uuid NOT NULL,
    rutina_id uuid,
    nombre character varying(255),
    notas_generales text
);

CREATE TABLE public.uploaded_files (
    created_at timestamp(6) with time zone NOT NULL,
    size bigint NOT NULL,
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    owner_role character varying(20) NOT NULL,
    visibility character varying(20) NOT NULL,
    purpose character varying(30) NOT NULL,
    mime_type character varying(100) NOT NULL,
    storage_key character varying(100) NOT NULL,
    original_filename character varying(255) NOT NULL,
    CONSTRAINT uploaded_files_owner_role_check CHECK (((owner_role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[]))),
    CONSTRAINT uploaded_files_purpose_check CHECK (((purpose)::text = ANY ((ARRAY['PROFILE_IMAGE'::character varying, 'CHAT_ATTACHMENT'::character varying])::text[]))),
    CONSTRAINT uploaded_files_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['PUBLIC'::character varying, 'PRIVATE'::character varying])::text[])))
);

CREATE TABLE public.user_consents (
    accepted boolean NOT NULL,
    accepted_at timestamp(6) with time zone,
    withdrawn_at timestamp(6) with time zone,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    version character varying(255) NOT NULL,
    CONSTRAINT user_consents_role_check CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'ENTRENADOR'::character varying])::text[]))),
    CONSTRAINT user_consents_type_check CHECK (((type)::text = ANY ((ARRAY['TERMS_OF_SERVICE'::character varying, 'PRIVACY_POLICY'::character varying, 'MARKETING'::character varying])::text[])))
);

CREATE TABLE public.usuario (
    apellido character varying(255) NOT NULL,
    contrasena character varying(255),
    email character varying(255),
    nombre character varying(255),
    rol character varying(255)
);

ALTER TABLE ONLY public.administrador
    ADD CONSTRAINT administrador_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_provider_provider_subject_key UNIQUE (provider, provider_subject);

ALTER TABLE ONLY public.chat_blocks
    ADD CONSTRAINT chat_blocks_pkey PRIMARY KEY (owner_id, target_id);

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT chat_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_reports
    ADD CONSTRAINT chat_reports_pkey PRIMARY KEY (message_id, reporter_id);

ALTER TABLE ONLY public.chat_restrictions
    ADD CONSTRAINT chat_restrictions_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_email_key UNIQUE (email);

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.detalle_rutina
    ADD CONSTRAINT detalle_rutina_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ejercicio
    ADD CONSTRAINT ejercicio_api_id_key UNIQUE (api_id);

ALTER TABLE ONLY public.ejercicio
    ADD CONSTRAINT ejercicio_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ejercicio
    ADD CONSTRAINT ejercicio_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.email_change_tokens
    ADD CONSTRAINT email_change_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.email_change_tokens
    ADD CONSTRAINT email_change_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.entrenador
    ADD CONSTRAINT entrenador_email_key UNIQUE (email);

ALTER TABLE ONLY public.entrenador
    ADD CONSTRAINT entrenador_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.entrenamiento
    ADD CONSTRAINT entrenamiento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.evento_calendario
    ADD CONSTRAINT evento_calendario_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_attachment_id_key UNIQUE (attachment_id);

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.moderation_audit
    ADD CONSTRAINT moderation_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.moderation_operators
    ADD CONSTRAINT moderation_operators_pkey PRIMARY KEY (user_id, role);

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.pending_social_auth
    ADD CONSTRAINT pending_social_auth_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pending_social_auth
    ADD CONSTRAINT pending_social_auth_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.progreso
    ADD CONSTRAINT progreso_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reauthentication_tokens
    ADD CONSTRAINT reauthentication_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reauthentication_tokens
    ADD CONSTRAINT reauthentication_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT resenas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rutina
    ADD CONSTRAINT rutina_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.serie_realizada
    ADD CONSTRAINT serie_realizada_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sesion_entrenamiento
    ADD CONSTRAINT sesion_entrenamiento_evento_calendario_id_key UNIQUE (evento_calendario_id);

ALTER TABLE ONLY public.sesion_entrenamiento
    ADD CONSTRAINT sesion_entrenamiento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_storage_key_key UNIQUE (storage_key);

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_role_type_key UNIQUE (user_id, role, type);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (apellido);

CREATE INDEX chat_reports_pending_idx ON public.chat_reports USING btree (status, created_at);

CREATE INDEX moderation_audit_report_idx ON public.moderation_audit USING btree (reporter_id, message_id, created_at);

ALTER TABLE ONLY public.sesion_entrenamiento
    ADD CONSTRAINT fk2x321wmgi25vc7hlb5led4gq5 FOREIGN KEY (cliente_id) REFERENCES public.cliente(id);

ALTER TABLE ONLY public.detalle_rutina
    ADD CONSTRAINT fk49xfgskr726i6rvsq6a9f8cwu FOREIGN KEY (ejercicio_id) REFERENCES public.ejercicio(id);

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT fk8jmgj6ttjulaej9c76meo1ukn FOREIGN KEY (entrenador_id) REFERENCES public.entrenador(id);

ALTER TABLE ONLY public.evento_calendario
    ADD CONSTRAINT fk94ugv49wtypgi9wpswty0rmws FOREIGN KEY (cliente_id) REFERENCES public.cliente(id);

ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT fkc7gvf9wxw1h7n5b66vtk4x0v5 FOREIGN KEY (id_entrenador) REFERENCES public.entrenador(id);

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT fkcndg5n4w5m9rfoj7hkyyapkv6 FOREIGN KEY (entrenador_id) REFERENCES public.entrenador(id);

ALTER TABLE ONLY public.detalle_rutina
    ADD CONSTRAINT fkcyhhfsn32b145tnodx72sliwg FOREIGN KEY (rutina_id) REFERENCES public.rutina(id);

ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT fkeugk79biba2bg18clg9guor1h FOREIGN KEY (id_cliente) REFERENCES public.cliente(id);

ALTER TABLE ONLY public.sesion_entrenamiento
    ADD CONSTRAINT fkhgx1i9ean5mf3js900pqdgw8y FOREIGN KEY (evento_calendario_id) REFERENCES public.evento_calendario(id);

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT fkhmmmdjnydhowv50h8m2c0bsme FOREIGN KEY (cliente_id) REFERENCES public.cliente(id);

ALTER TABLE ONLY public.serie_realizada
    ADD CONSTRAINT fkihy45hg3gg8gwtau4j5d8pkjd FOREIGN KEY (sesion_id) REFERENCES public.sesion_entrenamiento(id);

ALTER TABLE ONLY public.sesion_entrenamiento
    ADD CONSTRAINT fkjdkf7aylqm961l6a00jh9uydg FOREIGN KEY (rutina_id) REFERENCES public.rutina(id);

ALTER TABLE ONLY public.serie_realizada
    ADD CONSTRAINT fkk9u2gdcwcixl49lvcv36m3ako FOREIGN KEY (ejercicio_id) REFERENCES public.ejercicio(id);

ALTER TABLE ONLY public.entrenamiento
    ADD CONSTRAINT fkmmau121hqmc1pmp99eggwep40 FOREIGN KEY (cliente_id) REFERENCES public.cliente(id);

ALTER TABLE ONLY public.progreso
    ADD CONSTRAINT fkn5fn3738k9761wuaomo019kni FOREIGN KEY (entrenamiento_id) REFERENCES public.entrenamiento(id);

ALTER TABLE ONLY public.progreso
    ADD CONSTRAINT fknefqxepu60bd6wlrms8ksolof FOREIGN KEY (cliente_id) REFERENCES public.cliente(id);

ALTER TABLE ONLY public.entrenamiento
    ADD CONSTRAINT fknr36ewtixvixbbjdqwxojxeyl FOREIGN KEY (entrenador_id) REFERENCES public.entrenador(id);

ALTER TABLE ONLY public.evento_calendario
    ADD CONSTRAINT fkpujm4dpi6311m9d5ld5wdwepa FOREIGN KEY (rutina_id) REFERENCES public.rutina(id);

ALTER TABLE ONLY public.rutina
    ADD CONSTRAINT fkq8o4bakqt1u0ae73s5o4ahwa6 FOREIGN KEY (cliente_id) REFERENCES public.cliente(id);
