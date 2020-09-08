import main.sono.Datum;

public interface Listener {
	public void sendData(String header, String body, int i, Datum datum);
}
