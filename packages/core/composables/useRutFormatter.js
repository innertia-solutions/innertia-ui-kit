
export const useRutFormatter = (inputElement) => {
    const formatRut = (rut) => {
        const cleanRut = rut.replace(/[^\dKk]/g, '').toUpperCase(); // Limpiar caracteres no numéricos

        if (cleanRut.length <= 1) return cleanRut; // Si solo hay un dígito, no hacer formato

        const rutBody = cleanRut.slice(0, -1); // Cuerpo del RUT
        const dv = cleanRut.slice(-1); // Dígito verificador

        const formattedRut = rutBody.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Formatear cuerpo

        return `${formattedRut}-${dv}`; // Retornar RUT formateado
    };

    inputElement.addEventListener('input', (e) => {
        let formattedRut = formatRut(e.target.value);
        e.target.value = formattedRut;
    });
};
