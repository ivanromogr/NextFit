package com.tuap.backend.servicios.storage;

/** A provider failure, not an invalid user file. Never include provider credentials or URLs. */
public class StorageUnavailableException extends RuntimeException {
    public StorageUnavailableException() { super("Almacenamiento temporalmente no disponible"); }
}
