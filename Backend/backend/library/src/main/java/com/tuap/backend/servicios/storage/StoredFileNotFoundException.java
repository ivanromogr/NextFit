package com.tuap.backend.servicios.storage;

public class StoredFileNotFoundException extends RuntimeException {
    public StoredFileNotFoundException(String message) { super(message); }
}
