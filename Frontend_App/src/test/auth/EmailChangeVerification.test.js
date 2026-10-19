import React from 'react'; import {render,fireEvent,waitFor} from '@testing-library/react-native'; import ConfirmEmailChangeScreen from '../../screens/ConfirmEmailChangeScreen'; import * as api from '../../api/endpoints';
let mockLogin=jest.fn();jest.mock('../../api/endpoints',()=>({confirmEmailChange:jest.fn()}));jest.mock('../../components/context/AuthContext',()=>({useAuth:()=>({login:mockLogin})}));
describe('AUTH-3 móvil',()=>{const navigation={navigate:jest.fn()};beforeEach(()=>jest.clearAllMocks());it('confirma token temporal y actualiza sesión',async()=>{api.confirmEmailChange.mockResolvedValue({data:{accessToken:'new',refreshToken:'refresh',user:{id:'1',email:'new@nextfit.test'}}});const v=render(<ConfirmEmailChangeScreen route={{params:{token:'memory-only'}}} navigation={navigation}/>);await waitFor(()=>expect(api.confirmEmailChange).toHaveBeenCalledWith('memory-only'));expect(mockLogin).toHaveBeenCalled();expect(v.getByText(/confirmado correctamente/i)).toBeTruthy();});it('sin token no llama API',()=>{const v=render(<ConfirmEmailChangeScreen route={{params:{}}} navigation={navigation}/>);expect(api.confirmEmailChange).not.toHaveBeenCalled();expect(v.getByText(/no es válido/i)).toBeTruthy();});it('muestra error seguro de token',async()=>{api.confirmEmailChange.mockRejectedValue({response:{status:400}});const v=render(<ConfirmEmailChangeScreen route={{params:{token:'bad'}}} navigation={navigation}/>);expect(await v.findByText(/no es válido/i)).toBeTruthy();});});


describe('estabilidad de la confirmación de correo', () => {
  const navigation = { navigate: jest.fn() };
  beforeEach(() => { jest.clearAllMocks(); mockLogin = jest.fn(); });

  it('no vuelve a consumir el token cuando cambia la función de sesión', async () => {
    api.confirmEmailChange.mockResolvedValueOnce({ data: { accessToken: 'fixture' } });
    const route = { params: { token: 'single-use-fixture' } };
    const view = render(<ConfirmEmailChangeScreen route={route} navigation={navigation} />);
    await waitFor(() => view.getByText('Tu correo se ha confirmado correctamente.'));
    mockLogin = jest.fn();
    view.rerender(<ConfirmEmailChangeScreen route={route} navigation={navigation} />);
    expect(api.confirmEmailChange).toHaveBeenCalledTimes(1);
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('un fallo de red permite reintentar sin presentarlo como un enlace caducado', async () => {
    api.confirmEmailChange.mockRejectedValueOnce(new Error('network fixture'));
    api.confirmEmailChange.mockResolvedValueOnce({ data: { accessToken: 'fixture' } });
    const view = render(<ConfirmEmailChangeScreen route={{ params: { token: 'retry-fixture' } }} navigation={navigation} />);
    await waitFor(() => view.getByText(/Comprueba la conexión/));
    expect(view.queryByText(/no es válido o ha caducado/)).toBeNull();
    fireEvent.press(view.getByText('REINTENTAR'));
    await waitFor(() => view.getByText('Tu correo se ha confirmado correctamente.'));
    expect(api.confirmEmailChange).toHaveBeenCalledTimes(2);
  });

  it('no repite la confirmación si falla el guardado de la sesión local', async () => {
    api.confirmEmailChange.mockResolvedValueOnce({ data: { accessToken: 'fixture' } });
    mockLogin.mockRejectedValueOnce(new Error('local session fixture'));
    const view = render(<ConfirmEmailChangeScreen route={{ params: { token: 'consumed-fixture' } }} navigation={navigation} />);
    await waitFor(() => view.getByText(/no se pudo iniciar sesión/));
    expect(view.queryByText('REINTENTAR')).toBeNull();
    expect(api.confirmEmailChange).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByText('Ir a iniciar sesión'));
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });
});
