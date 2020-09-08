import main.sono.io.Output;

public class StandardOutput extends Output {
	private final Listener thread;
	private final int id;

	public StandardOutput(final Listener thread, final int id) {
		this.thread = thread;
		this.id = id;
	}

	@Override
	public void print(final String s) {
		thread.sendData("OUT", s, id, null);
	}
}
