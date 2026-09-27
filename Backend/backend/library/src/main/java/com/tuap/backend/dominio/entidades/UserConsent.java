package com.tuap.backend.dominio.entidades;
import java.time.Instant; import java.util.UUID; import com.tuap.backend.auth.Role; import jakarta.persistence.*;
@Entity @Table(name="user_consents", uniqueConstraints=@UniqueConstraint(columnNames={"user_id","role","type"})) public class UserConsent {
 @Id @GeneratedValue(strategy=GenerationType.AUTO) private UUID id; @Column(name="user_id",nullable=false) private UUID userId; @Enumerated(EnumType.STRING) @Column(nullable=false) private Role role; @Enumerated(EnumType.STRING) @Column(nullable=false) private ConsentType type; @Column(nullable=false) private String version; @Column(nullable=false) private boolean accepted; private Instant acceptedAt; private Instant withdrawnAt;
 protected UserConsent(){} public UserConsent(UUID u,Role r,ConsentType t,String v,boolean a,Instant at){userId=u;role=r;type=t;version=v;accepted=a;acceptedAt=a?at:null;withdrawnAt=a?null:at;}
 public UUID getUserId(){return userId;} public Role getRole(){return role;} public ConsentType getType(){return type;} public String getVersion(){return version;} public boolean isAccepted(){return accepted;} public Instant getAcceptedAt(){return acceptedAt;} public Instant getWithdrawnAt(){return withdrawnAt;} public void update(boolean value,String v,Instant at){version=v;accepted=value;if(value){acceptedAt=at;withdrawnAt=null;}else withdrawnAt=at;}
}
