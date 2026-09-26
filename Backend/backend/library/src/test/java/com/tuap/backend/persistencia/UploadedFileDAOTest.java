package com.tuap.backend.persistencia;
import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.entidades.*;
@DataJpaTest class UploadedFileDAOTest {
 @Autowired UploadedFileDAO dao;
 @Test void persistsMetadataWithEnumsAndServerTimestamp(){ UUID owner=UUID.randomUUID(); UploadedFile saved=dao.saveAndFlush(new UploadedFile(owner,Role.CLIENTE,UploadPurpose.PROFILE_IMAGE,UploadVisibility.PUBLIC,"opaque-key.jpg","photo.jpg","image/jpeg",123)); UploadedFile found=dao.findById(saved.getId()).orElseThrow(); assertEquals(owner,found.getOwnerId()); assertEquals(Role.CLIENTE,found.getOwnerRole()); assertEquals(UploadPurpose.PROFILE_IMAGE,found.getPurpose()); assertEquals(UploadVisibility.PUBLIC,found.getVisibility()); assertEquals("opaque-key.jpg",found.getStorageKey()); assertEquals("image/jpeg",found.getMimeType()); assertEquals(123,found.getSize()); assertNotNull(found.getCreatedAt()); }
}
